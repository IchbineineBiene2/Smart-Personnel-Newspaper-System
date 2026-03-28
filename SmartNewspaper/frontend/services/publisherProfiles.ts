import { ApiArticle, mapToContentCategory } from './newsApi';
import { Publisher, PublisherArticle, PUBLISHERS, PUBLISHER_ARTICLES } from './publisherData';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getPublisherIdFromSourceName(sourceName: string): string {
  const normalized = sourceName
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'unknown-source';
}

function getLogoText(sourceName: string): string {
  const parts = sourceName
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  return (parts[0] ?? sourceName).slice(0, 2).toUpperCase();
}

function buildSourceLogoUrl(sourceUrl?: string): string | undefined {
  if (!sourceUrl) return undefined;

  try {
    const host = new URL(sourceUrl).origin;
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(host)}`;
  } catch {
    return undefined;
  }
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function hashToPositiveInt(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function toDisplayDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function inferCadence(sortedByNewest: ApiArticle[]): string {
  if (!sortedByNewest.length) return 'Bilinmiyor';

  const first = new Date(sortedByNewest[0].publishedAt).getTime();
  const second = sortedByNewest[1] ? new Date(sortedByNewest[1].publishedAt).getTime() : first;
  const diff = Math.abs(first - second);

  if (diff < 8 * 60 * 60 * 1000) return 'Saatlik';
  if (diff < MS_PER_DAY) return 'Gunluk';
  if (diff < 3 * MS_PER_DAY) return 'Haftalik';
  return 'Duzenli';
}

function deriveCategory(articles: ApiArticle[]): string {
  const counts = new Map<string, number>();

  articles.forEach((article) => {
    const category = mapToContentCategory(article.category, article.title, article.description);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? 'Genel';
}

function isVerifiedSource(sourceName: string): boolean {
  const key = sourceName.toLocaleLowerCase('tr-TR');
  return ['hurriyet', 'hürriyet', 'sabah', 'cumhuriyet', 'milliyet', 'sozcu', 'reuters', 'bbc'].some((item) =>
    key.includes(item)
  );
}

export function buildPublisherDataset(apiArticles: ApiArticle[]): {
  publishers: Publisher[];
  articles: PublisherArticle[];
  filters: string[];
} {
  if (!apiArticles.length) {
    return {
      publishers: PUBLISHERS,
      articles: PUBLISHER_ARTICLES,
      filters: ['All Sources', ...Array.from(new Set(PUBLISHERS.map((item) => item.category)))],
    };
  }

  const byPublisher = new Map<string, ApiArticle[]>();

  apiArticles.forEach((article) => {
    const sourceName = article.source?.name?.trim() || 'Unknown Source';
    const key = getPublisherIdFromSourceName(sourceName);

    if (!byPublisher.has(key)) byPublisher.set(key, []);
    byPublisher.get(key)!.push(article);
  });

  const publishers: Publisher[] = [];
  const publisherArticles: PublisherArticle[] = [];

  byPublisher.forEach((items, publisherId) => {
    const sortedByNewest = [...items].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const sourceName = sortedByNewest[0]?.source?.name?.trim() || 'Unknown Source';
    const sourceUrl = sortedByNewest[0]?.source?.url;
    const category = deriveCategory(sortedByNewest) as Publisher['category'];

    const articleCount = sortedByNewest.length;
    const followersBase = Math.max(300, articleCount * 1200);

    publishers.push({
      id: publisherId,
      name: sourceName,
      logoText: getLogoText(sourceName),
      logoUrl: buildSourceLogoUrl(sourceUrl),
      description: `${sourceName} kaynagindan toplanan guncel haber akisi.`,
      category,
      readers: formatCompact(Math.max(500, articleCount * 700)),
      cadence: inferCadence(sortedByNewest),
      verified: isVerifiedSource(sourceName),
      followers: formatCompact(followersBase),
      articlesCount: formatCompact(articleCount),
      reporters: String(Math.max(3, Math.round(articleCount / 8))),
    });

    sortedByNewest.forEach((item) => {
      const hash = hashToPositiveInt(item.id);
      publisherArticles.push({
        id: item.id,
        publisherId,
        title: item.title,
        summary: (item.description || item.content || '').slice(0, 240),
        tag: mapToContentCategory(item.category, item.title, item.description),
        imageUrl: item.imageUrl,
        originalUrl: item.url,
        likes: 80 + (hash % 1500),
        comments: 5 + (hash % 120),
        publishedAt: toDisplayDate(item.publishedAt),
      });
    });
  });

  publishers.sort((a, b) => {
    const ac = Number(a.articlesCount.replace(/[^\d]/g, '')) || 0;
    const bc = Number(b.articlesCount.replace(/[^\d]/g, '')) || 0;
    return bc - ac;
  });

  const filters = ['All Sources', ...Array.from(new Set(publishers.map((item) => item.category)))];

  return {
    publishers,
    articles: publisherArticles,
    filters,
  };
}
