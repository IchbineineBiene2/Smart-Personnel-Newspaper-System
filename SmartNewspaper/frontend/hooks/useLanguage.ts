import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type AppLanguage = 'tr' | 'en' | 'de';

const LANGUAGE_STORAGE_KEY = 'selected-language';

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  tr: 'Turkce',
  en: 'English',
  de: 'Deutsch',
};

export const LANGUAGES: AppLanguage[] = ['tr', 'en', 'de'];

let currentLanguage: AppLanguage = 'tr';
let languageLoaded = false;
const listeners = new Set<(lang: AppLanguage) => void>();

function notifyLanguageChange(nextLanguage: AppLanguage) {
  currentLanguage = nextLanguage;
  listeners.forEach((listener) => listener(nextLanguage));
}

export function useLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>(currentLanguage);
  const [loading, setLoading] = useState(!languageLoaded);

  const loadLanguage = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      const resolved: AppLanguage =
        saved === 'tr' || saved === 'en' || saved === 'de' ? saved : 'tr';
      notifyLanguageChange(resolved);
      languageLoaded = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const listener = (nextLanguage: AppLanguage) => {
      setLanguageState(nextLanguage);
    };
    listeners.add(listener);

    if (languageLoaded) {
      setLanguageState(currentLanguage);
      setLoading(false);
    } else {
      loadLanguage();
    }

    return () => {
      listeners.delete(listener);
    };
  }, [loadLanguage]);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    notifyLanguageChange(nextLanguage);
    languageLoaded = true;
    setLoading(false);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  return {
    language,
    loading,
    setLanguage,
    reload: loadLanguage,
  };
}
