import axios from 'axios';
import * as cheerio from 'cheerio';

// Her haber sitesi için makale gövdesini hangi CSS seçiciden çekeceğimizi tanımlıyoruz
interface SiteRule {
  domain: string;
  contentSelector: string;   // Ana metin bloğu
  removeSelectors?: string[];  // Çıkarılacak elementler (reklam, paylaşım butonları vb.)
}

export interface ScrapedArticleDetails {
  content: string | null;
  images: string[];
}

type ImageCandidate = {
  url: string;
  meta: string;
  rank: number;
};

const SITE_RULES: SiteRule[] = [
  // ── Türkçe ──────────────────────────────────────────────────────────────
  {
    domain: 'hurriyet.com.tr',
    contentSelector: '.news-content, .content-text, article .newsDetay, .article-body, .haber-detay-content',
    removeSelectors: ['.news-tags', '.social-shares', '.related-news', 'script', 'style', '.advertisement', '.reklam'],
  },
  {
    domain: 'milliyet.com.tr',
    contentSelector: '.article-detail-content, .article-body, .articleContent, .detay-icerik',
    removeSelectors: ['.tags', '.share-bar', '.also-read', 'script', 'style'],
  },
  {
    domain: 'sabah.com.tr',
    contentSelector: '.newsDetailText, .newsBox, .newsArticle, .article-content, #news-body',
    removeSelectors: ['.tag-cloud', '.share', 'script', 'style', '.advertisement', '.detail-google-news', '.newsImage'],
  },
  {
    domain: 'ntv.com.tr',
    contentSelector: '.article-content, .news-text, .story-body, .article__content',
    removeSelectors: ['script', 'style', '.share-area', '.related-content'],
  },
  {
    domain: 'trthaber.com',
    contentSelector: '.news-content, .detail-content, .editor-text, .article-content, .news-text',
    removeSelectors: ['script', 'style', '.news-tags', '.share-buttons', '.related-news'],
  },
  {
    domain: 'haberturk.com',
    contentSelector: '.content, .news-detail, .article-body, figure, .content-text',
    removeSelectors: ['script', 'style', '.social-shares', '.tags', '.advertisement'],
  },
  {
    domain: 'cumhuriyet.com.tr',
    contentSelector: '.haberMetni, .news-content, .news-detail, .haber-detay',
    removeSelectors: ['script', 'style', '.post-tags', '.share-buttons', '.reklam'],
  },
  {
    domain: 'gazeteduvar.com.tr',
    contentSelector: '.content-text, .news-content, .article-content',
    removeSelectors: ['script', 'style', '.social-share', '.tags', '.related-news'],
  },
  {
    domain: 'karar.com',
    contentSelector: '.article-content, .news-content, .news-text',
    removeSelectors: ['script', 'style', '.post-tags', '.share-list', '.ad-box'],
  },
  {
    domain: 'indyturk.com',
    contentSelector: '.article-text, .content-body, .news-content, .field-name-body',
    removeSelectors: ['script', 'style', '.share-buttons', '.tags'],
  },
  {
    domain: 'diken.com.tr',
    contentSelector: '.entry-content, .article-content, .news-content',
    removeSelectors: ['script', 'style', '.social-share', '.post-tags'],
  },
  {
    domain: 'aspor.com.tr',
    contentSelector: '.haber-detay, .article-content, .news-content',
    removeSelectors: ['script', 'style', '.share-list', '.tag-list', '.ad-container'],
  },
  {
    domain: 'trtspor.com.tr',
    contentSelector: '.news-content, .article-content, .detail-content, .news-text',
    removeSelectors: ['script', 'style', '.social-shares', '.tags', '.related-news'],
  },
  {
    domain: 'shiftdelete.net',
    contentSelector: '.post-content, .article-content, .entry-content',
    removeSelectors: ['script', 'style', '.post-tags', '.share-buttons', '.ad-container'],
  },
  {
    domain: 'donanimhaber.com',
    contentSelector: '.haber-metni, .article-content, .news-content, .content',
    removeSelectors: ['script', 'style', '.tags', '.social-share', '.ad'],
  },
  {
    domain: 'webtekno.com',
    contentSelector: '.content-text, .article-content, .news-content',
    removeSelectors: ['script', 'style', '.tags', '.share-bar', '.ad-box'],
  },
  // ── İngilizce ───────────────────────────────────────────────────────────
  {
    domain: 'bbc.com',
    // BBC yapısı sık değişiyor; birden fazla seçici sırayla denenir
    contentSelector: [
      '[data-component="text-block"]',
      'article [class*="RichTextComponentWrapper"]',
      'article [class*="TextBlock"]',
      '.article__body-content p',
      'article p',
    ].join(', '),
    removeSelectors: ['script', 'style', 'figure', '[data-component="image-block"]', '.ad-slot'],
  },
  {
    domain: 'reuters.com',
    contentSelector: '.article-body__content, [class*="article-body"], .StandardArticleBody_body',
    removeSelectors: ['script', 'style', '.trust-badge', '.related-content'],
  },
  // ── Almanca / Deutsche Welle ─────────────────────────────────────────────
  {
    domain: 'dw.com',
    contentSelector: '.article__section, .longText, [class*="article__content"], .rich-text',
    removeSelectors: ['script', 'style', '.advertisement', '.kicker', '.social-links', '[class*="related"]'],
  },
  // ── Tagesschau ───────────────────────────────────────────────────────────
  {
    domain: 'tagesschau.de',
    contentSelector: '.article-module, .storyelement-text, .text article, .metatextblock',
    removeSelectors: ['script', 'style', '.socialbookmarks', '.modComment', '.linklist'],
  },
  // ── Spiegel ──────────────────────────────────────────────────────────────
  {
    domain: 'spiegel.de',
    // Spiegel bazı içerikleri paywall arkasında; açık kısımları alır
    contentSelector: '[data-sara-click-el="article_body"] p, .article-body p, .RichText p',
    removeSelectors: ['script', 'style', '.paywall', '.asset-box', '.ticker'],
  },
];

function findRule(url: string): SiteRule | null {
  return SITE_RULES.find((r) => url.includes(r.domain)) ?? null;
}

function cleanText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveImageUrl(baseUrl: string, src?: string): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseSrcSetFirstUrl(srcset?: string): string | null {
  if (!srcset) return null;
  const first = srcset
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .find(Boolean);
  return first ?? null;
}

function parseSrcSetBestUrl(srcset?: string): string | null {
  if (!srcset) return null;

  const entries = srcset
    .split(',')
    .map((part) => part.trim())
    .map((part) => {
      const [u, descriptor] = part.split(/\s+/, 2);
      const width = descriptor?.endsWith('w') ? Number(descriptor.slice(0, -1)) : 0;
      return { url: u, width: Number.isFinite(width) ? width : 0 };
    })
    .filter((e) => !!e.url);

  if (!entries.length) return null;
  entries.sort((a, b) => b.width - a.width);
  return entries[0].url;
}

function hasAdLikePattern(value: string): boolean {
  const v = value.toLowerCase();
  return [
    'doubleclick',
    'googlesyndication',
    'adservice',
    'adserver',
    '/ads/',
    'advert',
    'banner',
    'sponsor',
    'outbrain',
    'taboola',
    'pixel',
    'tracking',
    'analytics',
    'logo',
    'avatar',
    'icon',
    'sprite',
    'related',
    'teaser',
    'widget',
    'promo',
    'reklam',
  ].some((needle) => v.includes(needle));
}

function isLikelyArticleImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (hasAdLikePattern(lower)) return false;
  if (lower.startsWith('data:')) return false;
  if (/\.(svg|gif)(\?|$)/i.test(lower)) return false;
  return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(lower) || lower.includes('/image') || lower.includes('/img');
}

function tokenize(value: string): string[] {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ğüşöçıİâêîôûäöüß\s]/gi, ' ')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

function scoreImageRelevance(meta: string, keywords: Set<string>): number {
  const hay = tokenize(meta).join(' ');
  let score = 0;
  keywords.forEach((kw) => {
    if (hay.includes(kw)) score += 1;
  });
  return score;
}

function pickImageFromElement(
  $: ReturnType<typeof cheerio.load>,
  baseUrl: string,
  el: cheerio.Element,
  keywords: Set<string>,
  rank: number
): ImageCandidate | null {
  const node = $(el);
  const srcCandidate =
    node.attr('src') ||
    node.attr('data-src') ||
    node.attr('data-original') ||
    node.attr('data-lazy-src') ||
    parseSrcSetBestUrl(node.attr('srcset')) ||
    parseSrcSetBestUrl(node.attr('data-srcset')) ||
    parseSrcSetFirstUrl(node.attr('srcset')) ||
    parseSrcSetFirstUrl(node.attr('data-srcset'));

  const resolved = resolveImageUrl(baseUrl, srcCandidate ?? undefined);
  if (!resolved) return null;
  if (!isLikelyArticleImage(resolved)) return null;

  const classAndAlt = `${node.attr('class') ?? ''} ${node.attr('alt') ?? ''} ${node.attr('title') ?? ''} ${node.parent().attr('class') ?? ''}`;
  if (hasAdLikePattern(classAndAlt) || hasAdLikePattern(resolved)) return null;

  const figureCaption = node.closest('figure').find('figcaption').first().text();
  const meta = `${classAndAlt} ${figureCaption} ${resolved}`;
  const relevance = scoreImageRelevance(meta, keywords);

  return {
    url: resolved,
    meta,
    rank: rank + relevance * 10,
  };
}

function collectContainerImages(
  $: ReturnType<typeof cheerio.load>,
  baseUrl: string,
  root: any,
  keywords: Set<string>
): ImageCandidate[] {
  const sanitizedRoot = root.clone();
  sanitizedRoot.find('aside, nav, header, footer, [class*="related"], [class*="recommend"], [class*="teaser"], [class*="promo"], [class*="ad"], [id*="ad"], [class*="sidebar"], [id*="sidebar"], [class*="ticker"], [class*="breadcrumb"]').remove();

  const imgs = sanitizedRoot
    .find('img')
    .map((idx: number, img: any) => pickImageFromElement($, baseUrl, img, keywords, 100 - idx))
    .get();

  const pictureImgs = sanitizedRoot
    .find('picture source')
    .map((idx: number, source: any) => {
      const src =
        parseSrcSetBestUrl($(source).attr('srcset')) ||
        parseSrcSetBestUrl($(source).attr('data-srcset')) ||
        parseSrcSetFirstUrl($(source).attr('srcset')) ||
        parseSrcSetFirstUrl($(source).attr('data-srcset'));
      const resolved = resolveImageUrl(baseUrl, src ?? undefined);
      if (!resolved || !isLikelyArticleImage(resolved)) return null;
      if (hasAdLikePattern(resolved)) return null;
      const relevance = scoreImageRelevance(resolved, keywords);
      return { url: resolved, meta: resolved, rank: 70 - idx + relevance * 10 };
    })
    .get();

  return [...imgs, ...pictureImgs].filter(Boolean) as ImageCandidate[];
}

function extractJsonLdImages($: ReturnType<typeof cheerio.load>, baseUrl: string): string[] {
  const results: Array<string | null> = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== 'object') continue;

        const obj = node as Record<string, unknown>;
        const imageVal = obj.image;

        if (typeof imageVal === 'string') {
          results.push(resolveImageUrl(baseUrl, imageVal));
        } else if (Array.isArray(imageVal)) {
          imageVal.forEach((entry) => {
            if (typeof entry === 'string') {
              results.push(resolveImageUrl(baseUrl, entry));
            } else if (entry && typeof entry === 'object') {
              const e = entry as Record<string, unknown>;
              if (typeof e.url === 'string') results.push(resolveImageUrl(baseUrl, e.url));
            }
          });
        } else if (imageVal && typeof imageVal === 'object') {
          const imageObj = imageVal as Record<string, unknown>;
          if (typeof imageObj.url === 'string') {
            results.push(resolveImageUrl(baseUrl, imageObj.url));
          }
        }

        Object.values(obj).forEach((val) => {
          if (val && typeof val === 'object') queue.push(val);
        });
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  return results.filter(Boolean) as string[];
}

function uniqueImages(urls: Array<string | null | undefined>, maxCount = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  urls.forEach((url) => {
    if (!url) return;
    if (seen.has(url)) return;
    seen.add(url);
    out.push(url);
  });

  return out.slice(0, maxCount);
}

function extractNameTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length >= 6);
}

function bbcImagePostFilter(url: string, candidates: ImageCandidate[], ogCandidate: string | null): string[] {
  const isBbc = /bbc\./i.test(url);
  if (!isBbc) return uniqueImages(candidates.map((c) => c.url), 14);

  const isBbcTurkce = /bbc\.(com|co\.uk)\/turkce\//i.test(url);
  if (isBbcTurkce) {
    // BBC Turkce pages often include unrelated media cards; keep only the lead image.
    if (ogCandidate) return uniqueImages([ogCandidate], 1);

    const firstIchef = candidates.find((c) => /ichef\.bbci\.co\.uk/i.test(c.url))?.url;
    if (firstIchef) return uniqueImages([firstIchef], 1);

    return uniqueImages(candidates.map((c) => c.url), 1);
  }

  const ichefCandidates = candidates.filter((c) => /ichef\.bbci\.co\.uk/i.test(c.url));
  if (!ichefCandidates.length) {
    return uniqueImages(ogCandidate ? [ogCandidate] : candidates.map((c) => c.url), 3);
  }

  const ogPath = ogCandidate ? ogCandidate.split('/').pop() ?? '' : '';
  const ogTokens = extractNameTokens(ogPath);

  const related = ichefCandidates.filter((c) => {
    if (ogCandidate && c.url === ogCandidate) return true;
    if (!ogTokens.length) return false;
    const u = c.url.toLowerCase();
    return ogTokens.some((token) => u.includes(token));
  });

  if (related.length) {
    return uniqueImages(related.map((c) => c.url), 4);
  }

  return uniqueImages(ogCandidate ? [ogCandidate] : [ichefCandidates[0].url], 2);
}

function hurriyetImagePostFilter(url: string, candidates: ImageCandidate[], ogCandidate: string | null): string[] {
  const isHurriyet = /hurriyet\.com\.tr/i.test(url);
  if (!isHurriyet) return uniqueImages(candidates.map((c) => c.url), 14);

  const hurimgCandidates = candidates.filter((c) => /image\.hurimg\.com/i.test(c.url));
  if (!hurimgCandidates.length) {
    return uniqueImages(ogCandidate ? [ogCandidate] : candidates.map((c) => c.url), 2);
  }

  const ogPath = ogCandidate ? ogCandidate.split('/').pop() ?? '' : '';
  const ogTokens = extractNameTokens(ogPath);

  const related = hurimgCandidates
    .filter((c) => {
      const lower = c.url.toLowerCase();
      if (/galeri|video|canli|yazarlar|kategori|etiket|yatay|dikey|thumb|thumbnail/i.test(lower)) {
        return false;
      }
      if (ogCandidate && c.url === ogCandidate) return true;
      if (!ogTokens.length) return false;
      return ogTokens.some((token) => lower.includes(token));
    })
    .sort((a, b) => b.rank - a.rank);

  if (related.length) {
    return uniqueImages(related.map((c) => c.url), 2);
  }

  const best = [...hurimgCandidates].sort((a, b) => b.rank - a.rank)[0]?.url;
  return uniqueImages(ogCandidate ? [ogCandidate] : best ? [best] : hurimgCandidates.map((c) => c.url), 1);
}

function ntvImagePostFilter(url: string, candidates: ImageCandidate[], ogCandidate: string | null): string[] {
  const isNtv = /ntv\.com\.tr/i.test(url);
  if (!isNtv) return uniqueImages(candidates.map((c) => c.url), 14);

  const ntvCandidates = candidates
    .filter((c) => {
      const lower = c.url.toLowerCase();
      if (/video|galeri|yazarlar|etiket|kategori|thumb|thumbnail|sprite|logo|icon/i.test(lower)) {
        return false;
      }
      return /ntv|dogus|cdn/i.test(lower) || /\.(jpe?g|png|webp)(\?|$)/i.test(lower);
    })
    .sort((a, b) => b.rank - a.rank);

  if (!ntvCandidates.length) {
    return uniqueImages(ogCandidate ? [ogCandidate] : candidates.map((c) => c.url), 1);
  }

  const ogPath = ogCandidate ? ogCandidate.split('/').pop() ?? '' : '';
  const ogTokens = extractNameTokens(ogPath);

  const related = ntvCandidates.filter((c) => {
    if (ogCandidate && c.url === ogCandidate) return true;
    if (!ogTokens.length) return false;
    const lower = c.url.toLowerCase();
    return ogTokens.some((token) => lower.includes(token));
  });

  if (related.length) {
    return uniqueImages(related.map((c) => c.url), 1);
  }

  return uniqueImages(ogCandidate ? [ogCandidate] : [ntvCandidates[0].url], 1);
}

function sabahImagePostFilter(url: string, candidates: ImageCandidate[], ogCandidate: string | null): string[] {
  const isSabah = /sabah\.com\.tr/i.test(url);
  if (!isSabah) return uniqueImages(candidates.map((c) => c.url), 14);

  const sabahCandidates = candidates
    .filter((c) => {
      const lower = c.url.toLowerCase();
      if (/video|galeri|yazarlar|etiket|kategori|thumb|thumbnail|sprite|logo|icon|reklam/i.test(lower)) {
        return false;
      }
      return /sabah\.com\.tr|sabah|turkuvaz/i.test(lower) || /\.(jpe?g|png|webp)(\?|$)/i.test(lower);
    })
    .sort((a, b) => b.rank - a.rank);

  if (!sabahCandidates.length) {
    return uniqueImages(ogCandidate ? [ogCandidate] : candidates.map((c) => c.url), 1);
  }

  const ogPath = ogCandidate ? ogCandidate.split('/').pop() ?? '' : '';
  const ogTokens = extractNameTokens(ogPath);

  const related = sabahCandidates.filter((c) => {
    if (ogCandidate && c.url === ogCandidate) return true;
    if (!ogTokens.length) return false;
    const lower = c.url.toLowerCase();
    return ogTokens.some((token) => lower.includes(token));
  });

  if (related.length) {
    return uniqueImages(related.map((c) => c.url), 1);
  }

  return uniqueImages(ogCandidate ? [ogCandidate] : [sabahCandidates[0].url], 1);
}

function sourceImagePostFilter(url: string, candidates: ImageCandidate[], ogCandidate: string | null): string[] {
  if (/bbc\./i.test(url)) {
    return bbcImagePostFilter(url, candidates, ogCandidate);
  }

  if (/hurriyet\.com\.tr/i.test(url)) {
    return hurriyetImagePostFilter(url, candidates, ogCandidate);
  }

  if (/ntv\.com\.tr/i.test(url)) {
    return ntvImagePostFilter(url, candidates, ogCandidate);
  }

  if (/sabah\.com\.tr/i.test(url)) {
    return sabahImagePostFilter(url, candidates, ogCandidate);
  }

  return uniqueImages(candidates.map((c) => c.url), 14);
}

export async function scrapeArticleContent(url: string): Promise<string | null> {
  const details = await scrapeArticleDetails(url);
  return details.content;
}

export async function scrapeArticleDetails(url: string, context?: { title?: string; description?: string }): Promise<ScrapedArticleDetails> {
  const rule = findRule(url);
  if (!rule) return { content: null, images: [] };

  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const $ = cheerio.load(res.data as string);

    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="og:image"]').attr('content') ||
      $('meta[property="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content');

    // Gereksiz elementleri kaldır
    (rule.removeSelectors ?? []).forEach((sel) => $(sel).remove());
    $('aside, nav, header, footer, [class*="related"], [class*="recommend"], [class*="teaser"], [class*="promo"], [class*="ad"], [id*="ad"], [class*="sidebar"], [id*="sidebar"], [class*="ticker"], [class*="breadcrumb"]').remove();

    // Ana içeriği çek (tek eleman yerine tüm eşleşmeleri birleştir)
    const contentNodes = $(rule.contentSelector);
    const contentEl = contentNodes.length
      ? contentNodes
      : $('article, main, [role="main"]').first();

    if (!contentEl.length) return { content: null, images: [] };

    const keywordText = `${context?.title ?? ''} ${context?.description ?? ''}`;
    const keywords = new Set(tokenize(keywordText));

    const paragraphs = contentEl
      .find('p')
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((value) => value.length > 30);

    const headingBlocks = contentEl
      .find('h2, h3')
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((value) => value.length > 10);

    const textBlocks = [...headingBlocks, ...paragraphs];
    const text = textBlocks.length ? cleanText(textBlocks.join('\n\n')) : cleanText(contentEl.text());

    const containerRoots: any[] = [];
    contentNodes.each((_, el) => {
      const candidate = $(el).closest(
        'article, [itemprop="articleBody"], .article, .article-body, .news-content, .content-text, main'
      );
      containerRoots.push(candidate.length ? candidate.first() : $(el));
    });

    const rootImages = containerRoots.flatMap((root) => collectContainerImages($, url, root, keywords));
    const contentImages = collectContainerImages($, url, contentEl, keywords);

    const jsonLdImages = extractJsonLdImages($, url).map((img, idx) => ({
      url: img,
      meta: img,
      rank: 40 - idx + scoreImageRelevance(img, keywords) * 10,
    }));

    const ogCandidate = resolveImageUrl(url, ogImage);
    const scoredCandidates: ImageCandidate[] = [
      ...(ogCandidate ? [{ url: ogCandidate, meta: ogCandidate, rank: 200 + scoreImageRelevance(ogCandidate, keywords) * 10 }] : []),
      ...rootImages,
      ...contentImages,
      ...jsonLdImages,
    ];

    scoredCandidates.sort((a, b) => b.rank - a.rank);

    const images = sourceImagePostFilter(url, scoredCandidates, ogCandidate);

    // Çok kısa teaser metinleri eleyip, kısa haberleri de kaçırmamak için eşik düşük tutulur.
    return {
      content: text.length >= 120 ? text : null,
      images,
    };
  } catch {
    return { content: null, images: [] };
  }
}

// Bir makale listesindeki boş content'leri scraping ile doldurur
// Paralel istekleri sınırlamak için batchSize kullanılır
export async function enrichArticlesWithContent<T extends { url: string; content?: string; description: string }>(
  articles: T[],
  batchSize = 3
): Promise<T[]> {
  const toEnrich = articles.filter((a) => !a.content || a.content.length < 200);
  const results = [...articles];

  for (let i = 0; i < toEnrich.length; i += batchSize) {
    const batch = toEnrich.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (article) => {
        const fullText = await scrapeArticleContent(article.url);
        if (fullText) {
          const idx = results.findIndex((a) => a.url === article.url);
          if (idx !== -1) results[idx] = { ...results[idx], content: fullText };
        }
      })
    );
    // Site'ye yük bindirmemek için batch'ler arasında kısa bekleme
    if (i + batchSize < toEnrich.length) await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}
