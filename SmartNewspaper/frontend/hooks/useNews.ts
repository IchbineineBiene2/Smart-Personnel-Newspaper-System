import { useEffect, useState } from 'react';
import { ApiArticle, fetchArticles, mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { ContentCategory, NewsItem } from '@/services/content';
import { injectArticleCache } from '@/hooks/useSearch';

// Modül seviyesi cache — birden fazla ekran aynı veriyi paylaşır, tek istek yapılır
let cachedArticles: ApiArticle[] = [];
let pendingFetch: Promise<ApiArticle[]> | null = null;

async function loadArticles(): Promise<ApiArticle[]> {
  if (cachedArticles.length > 0) return cachedArticles;
  if (pendingFetch) return pendingFetch;

  pendingFetch = fetchArticles({ limit: 300 }).then((data) => {
    cachedArticles = data;
    injectArticleCache(data);
    pendingFetch = null;
    return data;
  });
  return pendingFetch;
}

/** Ham API makalelerini döndürür */
export function useApiNews() {
  const [articles, setArticles] = useState<ApiArticle[]>(cachedArticles);
  const [loading, setLoading] = useState(cachedArticles.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedArticles.length > 0) {
      setArticles(cachedArticles);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadArticles()
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
