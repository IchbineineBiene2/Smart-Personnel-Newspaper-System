import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { deleteBookmark, fetchBookmarks, saveBookmark } from '@/services/bookmarks';
import { ApiArticle } from '@/services/newsApi';

const STORAGE_KEY = 'saved-news-ids';
const STORAGE_ARTICLES_KEY = 'saved-news-articles';

/**
 * Bookmarks hook — auth varsa backend birincil, AsyncStorage hızlı cache.
 *
 * Login durumu:
 *   - Mount: önce local cache yüklenir (anında UI), sonra backend ile reconcile.
 *   - toggleSaved: local'i hemen günceller, backend'e POST/DELETE atar.
 *
 * Guest durumu:
 *   - Sadece local AsyncStorage — eski davranış.
 */
export function useBookmarks() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedArticles, setSavedArticles] = useState<ApiArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFromLocal = useCallback(async () => {
    const [rawIds, rawArticles] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(STORAGE_ARTICLES_KEY),
    ]);
    setSavedIds(rawIds ? (JSON.parse(rawIds) as string[]) : []);
    if (rawArticles) {
      try {
        setSavedArticles(JSON.parse(rawArticles));
      } catch { /* ignore */ }
    }
  }, []);

  const loadFromBackend = useCallback(async () => {
    const remote = await fetchBookmarks();
    if (!remote) return false;
    
    const mappedArticles: ApiArticle[] = remote.articles.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      content: '', // content typically fetched on demand or not fully stored here
      url: a.url,
      imageUrl: a.image_url || undefined,
      publishedAt: a.published_at,
      category: a.category || undefined,
      language: a.language || 'tr',
      source: { id: '', name: a.source_name, url: a.source_url, type: 'rss' }
    }));

    setSavedIds(remote.ids);
    setSavedArticles(mappedArticles);
    
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remote.ids)),
      AsyncStorage.setItem(STORAGE_ARTICLES_KEY, JSON.stringify(mappedArticles)),
    ]);
    return true;
  }, []);

  const loadBookmarks = useCallback(async () => {
    try {
      await loadFromLocal();
      await loadFromBackend(); // login varsa overwrite, yoksa no-op
    } finally {
      setLoading(false);
    }
  }, [loadFromBackend, loadFromLocal]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const toggleSaved = useCallback(
    async (id: string) => {
      const isSaved = savedIds.includes(id);
      const next = isSaved ? savedIds.filter((x) => x !== id) : [...savedIds, id];
      setSavedIds(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      
      if (isSaved) {
        const nextArticles = savedArticles.filter(a => a.id !== id);
        setSavedArticles(nextArticles);
        await AsyncStorage.setItem(STORAGE_ARTICLES_KEY, JSON.stringify(nextArticles));
      }
      // Backend sync — fire-and-forget; başarısızsa local yine doğru
      if (isSaved) {
        void deleteBookmark(id);
      } else {
        void saveBookmark(id);
      }
    },
    [savedIds],
  );

  return {
    savedIds,
    savedArticles,
    loading,
    toggleSaved,
    reload: loadBookmarks,
  };
}
