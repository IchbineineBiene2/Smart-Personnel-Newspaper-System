import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { ContentCategory, NewspaperSource } from '@/services/content';
import {
  fetchPreferencesFromBackend,
  pushPreferencesToBackend,
} from '@/services/preferences';

const CATEGORIES_STORAGE_KEY = 'preferred-categories';
const NEWSPAPERS_STORAGE_KEY = 'preferred-newspapers';
const NEWS_LANGUAGES_STORAGE_KEY = 'preferred-news-languages';
const MUTED_SOURCES_STORAGE_KEY = 'muted-newspapers';

/**
 * Preferences hook.
 *
 * - Login varsa backend birincil kaynak; AsyncStorage hızlı geri-yükleme için cache.
 * - Login yoksa sadece AsyncStorage çalışır (eski davranış).
 * - persist*() çağrıları local state'i güncelleyip arka planda backend'e PUT eder.
 */
export function usePreferences() {
  const [preferredCategories, setPreferredCategories] = useState<ContentCategory[]>([]);
  const [preferredNewspapers, setPreferredNewspapers] = useState<NewspaperSource[]>([]);
  const [preferredNewsLanguages, setPreferredNewsLanguages] = useState<string[]>([]);
  const [mutedNewspapers, setMutedNewspapers] = useState<NewspaperSource[]>([]);
  const [loading, setLoading] = useState(true);

  // --- LOCAL (AsyncStorage) ---
  const loadFromLocal = useCallback(async () => {
    const [rawCategories, rawNewspapers, rawNewsLanguages, rawMuted] = await Promise.all([
      AsyncStorage.getItem(CATEGORIES_STORAGE_KEY),
      AsyncStorage.getItem(NEWSPAPERS_STORAGE_KEY),
      AsyncStorage.getItem(NEWS_LANGUAGES_STORAGE_KEY),
      AsyncStorage.getItem(MUTED_SOURCES_STORAGE_KEY),
    ]);
    setPreferredCategories(rawCategories ? (JSON.parse(rawCategories) as ContentCategory[]) : []);
    setPreferredNewspapers(rawNewspapers ? (JSON.parse(rawNewspapers) as NewspaperSource[]) : []);
    setPreferredNewsLanguages(rawNewsLanguages ? (JSON.parse(rawNewsLanguages) as string[]) : []);
    setMutedNewspapers(rawMuted ? (JSON.parse(rawMuted) as NewspaperSource[]) : []);
  }, []);

  // --- BACKEND (when logged in) — overwrites local state + storage if returns data ---
  const loadFromBackend = useCallback(async () => {
    const remote = await fetchPreferencesFromBackend();
    if (!remote) return false;
    const cats = (remote.preferredCategories ?? []) as ContentCategory[];
    const langs = remote.preferredLanguages ?? [];
    const srcs = (remote.preferredSources ?? []) as NewspaperSource[];
    const muted = (remote.mutedSources ?? []) as NewspaperSource[];
    setPreferredCategories(cats);
    setPreferredNewsLanguages(langs);
    setPreferredNewspapers(srcs);
    setMutedNewspapers(muted);
    // Local cache da güncelle — sonraki açılışta hemen geri-yüklensin
    await Promise.all([
      AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats)),
      AsyncStorage.setItem(NEWS_LANGUAGES_STORAGE_KEY, JSON.stringify(langs)),
      AsyncStorage.setItem(NEWSPAPERS_STORAGE_KEY, JSON.stringify(srcs)),
      AsyncStorage.setItem(MUTED_SOURCES_STORAGE_KEY, JSON.stringify(muted)),
    ]);
    return true;
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      // 1) Local — anında ilk render
      await loadFromLocal();
      // 2) Backend — varsa overwrite (login yoksa null döner, no-op)
      await loadFromBackend();
    } finally {
      setLoading(false);
    }
  }, [loadFromBackend, loadFromLocal]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // --- Persist helpers — state + AsyncStorage + backend PUT (fire-and-forget) ---
  const persistCategories = useCallback(async (categories: ContentCategory[]) => {
    setPreferredCategories(categories);
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    void pushPreferencesToBackend({ preferredCategories: categories });
  }, []);

  const persistNewspapers = useCallback(async (newspapers: NewspaperSource[]) => {
    setPreferredNewspapers(newspapers);
    await AsyncStorage.setItem(NEWSPAPERS_STORAGE_KEY, JSON.stringify(newspapers));
    void pushPreferencesToBackend({ preferredSources: newspapers as string[] });
  }, []);

  const persistNewsLanguages = useCallback(async (languages: string[]) => {
    setPreferredNewsLanguages(languages);
    await AsyncStorage.setItem(NEWS_LANGUAGES_STORAGE_KEY, JSON.stringify(languages));
    void pushPreferencesToBackend({ preferredLanguages: languages });
  }, []);

  const persistMutedNewspapers = useCallback(async (muted: NewspaperSource[]) => {
    setMutedNewspapers(muted);
    await AsyncStorage.setItem(MUTED_SOURCES_STORAGE_KEY, JSON.stringify(muted));
    void pushPreferencesToBackend({ mutedSources: muted as string[] });
  }, []);

  const toggleCategory = useCallback(
    async (category: ContentCategory) => {
      const next = preferredCategories.includes(category)
        ? preferredCategories.filter((item) => item !== category)
        : [...preferredCategories, category];
      await persistCategories(next);
    },
    [persistCategories, preferredCategories],
  );

  const toggleNewspaper = useCallback(
    async (newspaper: NewspaperSource) => {
      const next = preferredNewspapers.includes(newspaper)
        ? preferredNewspapers.filter((item) => item !== newspaper)
        : [...preferredNewspapers, newspaper];
      await persistNewspapers(next);
    },
    [persistNewspapers, preferredNewspapers],
  );

  const toggleNewsLanguage = useCallback(
    async (language: string) => {
      const next = preferredNewsLanguages.includes(language)
        ? preferredNewsLanguages.filter((item) => item !== language)
        : [...preferredNewsLanguages, language];
      await persistNewsLanguages(next);
    },
    [persistNewsLanguages, preferredNewsLanguages],
  );

  const toggleMutedNewspaper = useCallback(
    async (newspaper: NewspaperSource) => {
      const next = mutedNewspapers.includes(newspaper)
        ? mutedNewspapers.filter((item) => item !== newspaper)
        : [...mutedNewspapers, newspaper];
      await persistMutedNewspapers(next);
    },
    [mutedNewspapers, persistMutedNewspapers],
  );

  return {
    preferredCategories,
    preferredNewspapers,
    preferredNewsLanguages,
    mutedNewspapers,
    loading,
    toggleCategory,
    toggleNewspaper,
    toggleNewsLanguage,
    toggleMutedNewspaper,
    reload: loadPreferences,
  };
}
