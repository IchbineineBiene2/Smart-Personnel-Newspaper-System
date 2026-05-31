import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ContentCategory } from '@/services/content';
import { ApiArticle, mapArticleToContentCategory, proxyImageUrl } from '@/services/newsApi';

// useNews.ts'deki modül-seviyesi cache'e erişim
let _cachedRef: ApiArticle[] = [];
export function injectArticleCache(articles: ApiArticle[]) {
  _cachedRef = articles;
}
export function getArticleCache(): ApiArticle[] {
  return _cachedRef;
}

const RECENT_SEARCHES_KEY = 'recent-searches';
const MAX_RECENT = 8;
const GENERATED_RECENT_SEARCH_TERMS = new Set([
  'general',
  'sports',
  'politics',
  'entertainment',
  'technology',
  'business',
  'health',
  'science',
  'breaking',
  'economy',
]);

export type SortOption = 'newest' | 'oldest' | 'popular';

export interface SearchFilters {
  query: string;
  category: ContentCategory | null;
  language: 'all' | 'tr' | 'en' | 'de';
  source: string | null;
  sortBy: SortOption;
}

export const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  category: null,
  language: 'all',
  source: null,
  sortBy: 'newest',
};

// Popülerlik skoru: DB tıklanma sayısı + güncellik
function popularityScore(article: ApiArticle): number {
  const age = Date.now() - new Date(article.publishedAt).getTime();
  const hoursOld = age / (1000 * 60 * 60);
  return (article.viewCount ?? 0) * 100 + Math.max(0, 100 - hoursOld * 0.5);
}

// Trend haberleri: son 24 saatte en yeni ve öne çıkan
export function getTrendingArticles(articles: ApiArticle[], count = 10): ApiArticle[] {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = articles.filter(
    (a) => new Date(a.publishedAt).getTime() > oneDayAgo
  );
  const pool = recent.length >= count ? recent : articles;
  return [...pool]
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, count);
}

function normTr(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function normalizeRecentTerm(term: string): string {
  return normTr(term)
    .replace(/[^a-z0-9\s&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanRecentSearches(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];

  values.forEach((value) => {
    const term = String(value ?? '').trim();
    const normalized = normalizeRecentTerm(term);
    if (!term || term.length < 2 || GENERATED_RECENT_SEARCH_TERMS.has(normalized) || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    cleaned.push(term);
  });

  return cleaned.slice(0, MAX_RECENT);
}

function matchesQuery(article: ApiArticle, q: string): boolean {
  if (!q) return true;
  const norm = normTr(q);
  return (
    normTr(article.title).includes(norm) ||
    normTr(article.description).includes(norm) ||
    normTr(article.source.name).includes(norm)
  );
}

export function useSearch(articles: ApiArticle[]) {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Recent searches yükle
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY).then((raw) => {
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const cleaned = cleanRecentSearches(parsed);
      setRecentSearches(cleaned);
      if (!Array.isArray(parsed) || cleaned.length !== parsed.length) {
        void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(cleaned));
      }
    });
  }, []);

  // Query debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters.query]);

  const saveRecentSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (!trimmed || trimmed.length < 2) return;
      const normalized = normalizeRecentTerm(trimmed);
      if (GENERATED_RECENT_SEARCH_TERMS.has(normalized)) return;
      const next = [
        trimmed,
        ...recentSearches.filter((s) => normalizeRecentTerm(s) !== normalized),
      ].slice(0, MAX_RECENT);
      setRecentSearches(next);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    },
    [recentSearches]
  );

  const clearRecentSearches = useCallback(async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  const updateFilter = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  // Filtrelenmiş sonuçlar
  const results = useMemo(() => {
    let pool = articles;

    if (debouncedQuery) pool = pool.filter((a) => matchesQuery(a, debouncedQuery));

    if (filters.category) {
      pool = pool.filter(
        (a) =>
          mapArticleToContentCategory(a) === filters.category
      );
    }

    if (filters.language !== 'all') {
      pool = pool.filter((a) => a.language === filters.language);
    }

    if (filters.source) {
      pool = pool.filter((a) =>
        a.source.name.toLowerCase().includes(filters.source!.toLowerCase())
      );
    }

    switch (filters.sortBy) {
      case 'newest':
        pool = [...pool].sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        break;
      case 'oldest':
        pool = [...pool].sort(
          (a, b) =>
            new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        );
        break;
      case 'popular':
        pool = [...pool].sort((a, b) => popularityScore(b) - popularityScore(a));
        break;
    }

    return pool;
  }, [articles, debouncedQuery, filters]);

  // Aktif filtre sayısı (query hariç)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.language !== 'all') count++;
    if (filters.source) count++;
    if (filters.sortBy !== 'newest') count++;
    return count;
  }, [filters]);

  // Mevcut kaynaklara göre source listesi
  const availableSources = useMemo(
    () => [...new Set(articles.map((a) => a.source.name))].sort(),
    [articles]
  );

  return {
    filters,
    results,
    debouncedQuery,
    recentSearches,
    activeFilterCount,
    availableSources,
    updateFilter,
    resetFilters,
    saveRecentSearch,
    clearRecentSearches,
  };
}

// Kaydedilen haberleri bookmark ID listesi + artikel cache'den birleştirir
export function useSavedArticles(savedIds: string[], articles: ApiArticle[]) {
  return useMemo(
    () =>
      savedIds
        .map((id) => articles.find((a) => a.id === id))
        .filter((a): a is ApiArticle => Boolean(a))
        .map((a) => ({ ...a, imageUrl: proxyImageUrl(a.imageUrl) })),
    [savedIds, articles]
  );
}
