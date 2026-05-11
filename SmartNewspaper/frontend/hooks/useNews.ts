import { useEffect, useState, useRef } from 'react';
import { ApiArticle, fetchArticles, mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { ContentCategory, NewsItem } from '@/services/content';
import { injectArticleCache } from '@/hooks/useSearch';

// Modül seviyesi cache — birden fazla ekran aynı veriyi paylaşır, tek istek yapılır
let cachedArticles: ApiArticle[] = [];
let pendingFetch: Promise<ApiArticle[]> | null = null;
const languageCache = new Map<string, ApiArticle[]>();
const languagePendingFetch = new Map<string, Promise<ApiArticle[]>>();

async function loadArticles(): Promise<ApiArticle[]> {
  if (pendingFetch) return pendingFetch;

  pendingFetch = fetchArticles({ limit: 300 }).then((data) => {
    cachedArticles = data;
    injectArticleCache(data);
    pendingFetch = null;
    return data;
  });
  return pendingFetch;
}

function normalizeLanguages(languages?: string[]): string[] {
  return [...new Set((languages ?? []).map((item) => item.trim()).filter(Boolean))].sort();
}

function mergeAndSortArticles(groups: ApiArticle[][]): ApiArticle[] {
  const seen = new Set<string>();
  return groups
    .flat()
    .filter((article) => {
      if (seen.has(article.id)) return false;
      seen.add(article.id);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function getCachedArticlesForLanguages(languages: string[]): ApiArticle[] {
  const normalized = normalizeLanguages(languages);
  if (normalized.length === 0) return cachedArticles;

  const groups: ApiArticle[][] = [];
  for (const language of normalized) {
    const cached = languageCache.get(language);
    if (!cached) return [];
    groups.push(cached);
  }

  const merged = mergeAndSortArticles(groups);
  injectArticleCache(merged);
  return merged;
}

async function loadArticlesForLanguages(languages: string[], force = false): Promise<ApiArticle[]> {
  const normalized = normalizeLanguages(languages);
  if (normalized.length === 0) return loadArticles();

  const groups = await Promise.all(
    normalized.map((language) => {
      const pending = languagePendingFetch.get(language);
      if (pending) return pending;

      const cached = languageCache.get(language);
      if (cached && !force) return cached;

      const request = fetchArticles({ language, limit: 300 }).then((data) => {
        languageCache.set(language, data);
        injectArticleCache(data);
        languagePendingFetch.delete(language);
        return data;
      });
      languagePendingFetch.set(language, request);
      return request;
    })
  );

  return mergeAndSortArticles(groups);
}

/** Ham API makalelerini döndürür */
export function useApiNews(languages: string[] = []) {
  const normalizedLanguages = normalizeLanguages(languages);
  const languageKey = normalizedLanguages.join(',');
  const [articles, setArticles] = useState<ApiArticle[]>(() => getCachedArticlesForLanguages(normalizedLanguages));
  const [loading, setLoading] = useState(cachedArticles.length === 0 || normalizedLanguages.length > 0);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;
    const hasLanguageFilter = normalizedLanguages.length > 0;
    const cached = getCachedArticlesForLanguages(normalizedLanguages);
    const load = (force = false) => hasLanguageFilter
      ? loadArticlesForLanguages(normalizedLanguages, force)
      : loadArticles();

    // İlk yükleme
    if (hasLanguageFilter) {
      setArticles(cached);
    }

    if (cached.length === 0 || hasLanguageFilter) {
      setLoading(true);
      load()
        .then((data) => {
          if (!active) return;
          setArticles(data);
          setLoading(false);
        })
        .catch((err: Error) => {
          if (!active) return;
          setError(err.message);
          setLoading(false);
        });
    } else {
      setArticles(cached);
      setLoading(false);
    }

    // Her 30 saniyede yeni haberler kontrol et (polling)
    pollingIntervalRef.current = setInterval(() => {
      load(true)
        .then((data) => {
          if (!active) return;
          setArticles(data);
        })
        .catch(() => {
          // Hata sessiz geçsin, UI etkilemesin
        });
    }, 30 * 1000); // 30 saniye

    return () => {
      active = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [languageKey]);

  return { articles, loading, error };
}

/** Mevcut NewsItem tipine uygun olarak dönüştürülmüş haberleri döndürür */
export function useNews(): { news: NewsItem[]; loading: boolean; error: string | null } {
  const { articles, loading, error } = useApiNews();

  const news: NewsItem[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    excerpt: a.description,
    category: mapToContentCategory(a.category, a.title, a.description),
  }));

  return { news, loading, error };
}

/** Belirli bir kategoriye göre filtrelenmiş haberler */
export function useNewsByCategory(category: ContentCategory | null) {
  const { news, loading, error } = useNews();
  const filtered = category ? news.filter((n) => n.category === category) : news;
  return { news: filtered, loading, error };
}

/** index.tsx (Kisisel Gazete) için PersonalizedNewsItem formatına dönüştürür */
export function usePersonalizedNews() {
  const { articles, loading, error } = useApiNews();

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const ONE_WEEK = 7 * ONE_DAY;

  const hashToPositiveInt = (input: string): number => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash;
  };

  const personalized = articles.map((a, i) => {
    const publishedAt = new Date(a.publishedAt).getTime();
    const age = now - publishedAt;
    const period: 'daily' | 'weekly' | 'both' =
      age < ONE_DAY ? 'daily' : age < ONE_WEEK ? 'both' : 'weekly';

    const hash = hashToPositiveInt(a.id);

    return {
      id: a.id,
      title: a.title,
      summary: a.description,
      source: a.source.name,
      sourceUrl: a.source.url,
      publicationDate: a.publishedAt,
      category: mapToContentCategory(a.category, a.title, a.description),
      popularity: Math.max(10, 100 - Math.floor(age / (60 * 60 * 1000))),
      relevance: 50 + (i % 50),
      period,
      url: a.url,
      imageUrl: proxyImageUrl(a.imageUrl),
      language: a.language,
      likes: 80 + (hash % 1500),
      comments: 5 + (hash % 120),
    };
  });

  return { news: personalized, loading, error };
}
