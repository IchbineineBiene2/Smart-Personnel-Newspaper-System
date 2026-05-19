import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { deleteBookmark, fetchBookmarks, saveBookmark } from '@/services/bookmarks';

const STORAGE_KEY = 'saved-news-ids';

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
  const [loading, setLoading] = useState(true);

  const loadFromLocal = useCallback(async () => {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEY);
    setSavedIds(rawValue ? (JSON.parse(rawValue) as string[]) : []);
  }, []);

  const loadFromBackend = useCallback(async () => {
    const remote = await fetchBookmarks();
    if (!remote) return false;
    setSavedIds(remote.ids);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remote.ids));
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
    loading,
    toggleSaved,
    reload: loadBookmarks,
  };
}
