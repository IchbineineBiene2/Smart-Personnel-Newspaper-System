import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'saved-news-ids';

export function useBookmarks() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    try {
      const rawValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (rawValue) {
        const parsed = JSON.parse(rawValue) as string[];
        setSavedIds(parsed);
      } else {
        setSavedIds([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const persist = useCallback(async (ids: string[]) => {
    setSavedIds(ids);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const toggleSaved = useCallback(
    async (id: string) => {
      const next = savedIds.includes(id)
        ? savedIds.filter((savedId) => savedId !== id)
        : [...savedIds, id];

      await persist(next);
    },
    [persist, savedIds]
  );

  return {
    savedIds,
    loading,
    toggleSaved,
    reload: loadBookmarks,
  };
}
