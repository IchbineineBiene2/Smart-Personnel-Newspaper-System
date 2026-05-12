import Parser from 'rss-parser';
import { Article } from '../models/Article';
import { generateArticleId } from '../processors/duplicateDetector';
import { RSS_SOURCES, RssSource } from '../config/sources';

// media:thumbnail ve media:content alanlarını da parse et (BBC, DW, Tagesschau için)
const parser = new Parser({
  timeout: 30000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
    ],
  },
});

/** RSS item'dan resim URL'sini çıkarır — birden fazla olası kaynağı dener */
function extractImageUrl(item: Record<string, unknown>): string | undefined {
  // 1. Standard enclosure
  const enc = item.enclosure as { url?: string } | undefined;
  if (enc?.url) return enc.url;

  // 2. media:thumbnail (BBC, DW)
  const thumb = item.mediaThumbnail as { $?: { url?: string }; url?: string } | string | undefined;
  if (typeof thumb === 'string' && thumb.startsWith('http')) return thumb;
  if (thumb && typeof thumb === 'object') {
    const thumbUrl = (thumb as { $?: { url?: string }; url?: string }).$?.url ?? (thumb as { url?: string }).url;
    if (thumbUrl) return thumbUrl;
  }

  // 3. media:content (bazı Alman kaynaklar)
  const mc = item.mediaContent as { $?: { url?: string }; url?: string } | string | undefined;
  if (typeof mc === 'string' && mc.startsWith('http')) return mc;
  if (mc && typeof mc === 'object') {
    const mcUrl = (mc as { $?: { url?: string }; url?: string }).$?.url ?? (mc as { url?: string }).url;
    if (mcUrl) return mcUrl;
  }

  // 4. İçerik HTML'inde <img> etiketi
  const html = (item['content:encoded'] ?? item.content ?? '') as string;
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return undefined;
}

async function fetchWithRetry(url: string, options: any, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await parser.parseURL(url);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, 2000 * (attempt + 1)));
    }
  }
}

async function fetchFeed(source: RssSource): Promise<Article[]> {
  const feed = await fetchWithRetry(source.url, { requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } } });
  return (feed.items as unknown as Record<string, unknown>[])
    .filter((item) => item.link && item.title)
    .map((item) => ({
      id: generateArticleId(item.link as string),
      title: item.title as string,
      description: (item.contentSnippet ?? item.summary ?? '') as string,
      content: item.content ? (item.content as string) : undefined,
      url: item.link as string,
      imageUrl: extractImageUrl(item),
      publishedAt: parsePublishedAt(item.pubDate as string | undefined),
      source: {
        name: source.name,
        url: source.url,
        type: 'rss' as const,
      },
      category: source.category,
      language: source.language,
    }));
}

function parsePublishedAt(pubDate?: string): Date {
  if (!pubDate) return new Date();
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return new Date();

  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  return parsed.getTime() > fiveMinutesFromNow ? new Date() : parsed;
}

export async function fetchAllRssFeeds(): Promise<Article[]> {
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchFeed));
  const articles: Article[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    } else {
      console.error(`RSS fetch failed: ${RSS_SOURCES[i].name}`, result.reason);
    }
  });
  return articles;
}

export async function fetchRssFeed(source: RssSource): Promise<Article[]> {
  return fetchFeed(source);
}
