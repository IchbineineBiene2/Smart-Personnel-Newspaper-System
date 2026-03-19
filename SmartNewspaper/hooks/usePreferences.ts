import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { ContentCategory, NewspaperSource } from '@/services/content';

const CATEGORIES_STORAGE_KEY = 'preferred-categories';
const NEWSPAPERS_STORAGE_KEY = 'preferred-newspapers';

export function usePreferences() {
  const [preferredCategories, setPreferredCategories] = useState<ContentCategory[]>([]);
  const [preferredNewspapers, setPreferredNewspapers] = useState<NewspaperSource[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    try {
      const [rawCategories, rawNewspapers] = await Promise.all([
        AsyncStorage.getItem(CATEGORIES_STORAGE_KEY),
        AsyncStorage.getItem(NEWSPAPERS_STORAGE_KEY),
      ]);

      if (rawCategories) {
        const parsedCategories = JSON.parse(rawCategories) as ContentCategory[];
        setPreferredCategories(parsedCategories);
      } else {
        setPreferredCategories([]);
      }

      if (rawNewspapers) {
        const parsedNewspapers = JSON.parse(rawNewspapers) as NewspaperSource[];
        setPreferredNewspapers(parsedNewspapers);
      } else {
        setPreferredNewspapers([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const persistCategories = useCallback(async (categories: ContentCategory[]) => {
    setPreferredCategories(categories);
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }, []);

  const persistNewspapers = useCallback(async (newspapers: NewspaperSource[]) => {
    setPreferredNewspapers(newspapers);
    await AsyncStorage.setItem(NEWSPAPERS_STORAGE_KEY, JSON.stringify(newspapers));
  }, []);

  const toggleCategory = useCallback(
    async (category: ContentCategory) => {
      const next = preferredCategories.includes(category)
        ? preferredCategories.filter((item) => item !== category)
        : [...preferredCategories, category];

      await persistCategories(next);
    },
    [persistCategories, preferredCategories]
  );

  const toggleNewspaper = useCallback(
    async (newspaper: NewspaperSource) => {
      const next = preferredNewspapers.includes(newspaper)
        ? preferredNewspapers.filter((item) => item !== newspaper)
        : [...preferredNewspapers, newspaper];

      await persistNewspapers(next);
    },
    [persistNewspapers, preferredNewspapers]
  );

  return {
    preferredCategories,
    preferredNewspapers,
    loading,
    toggleCategory,
    toggleNewspaper,
    reload: loadPreferences,
  };
}
