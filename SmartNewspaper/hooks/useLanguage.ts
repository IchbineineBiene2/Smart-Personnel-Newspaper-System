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

export function useLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>('tr');
  const [loading, setLoading] = useState(true);

  const loadLanguage = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'tr' || saved === 'en' || saved === 'de') {
        setLanguageState(saved);
      } else {
        setLanguageState('tr');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  return {
    language,
    loading,
    setLanguage,
    reload: loadLanguage,
  };
}
