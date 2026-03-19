import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { ThemeName, THEMES } from '@/services/themes';

const THEME_STORAGE_KEY = 'selected-theme';
type ThemeListener = (name: ThemeName) => void;

const listeners = new Set<ThemeListener>();
let sharedThemeName: ThemeName = 'stone';
let hasLoadedTheme = false;

function broadcastTheme(name: ThemeName) {
  sharedThemeName = name;
  listeners.forEach((listener) => listener(name));
}

export function useTheme() {
  const [themeName, setThemeName] = useState<ThemeName>(sharedThemeName);
  const [loading, setLoading] = useState(!hasLoadedTheme);

  const loadTheme = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved in THEMES)) {
        broadcastTheme(saved as ThemeName);
      } else {
        broadcastTheme('stone');
      }
    } finally {
      hasLoadedTheme = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const listener: ThemeListener = (name) => {
      setThemeName(name);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (hasLoadedTheme) {
      setThemeName(sharedThemeName);
      setLoading(false);
      return;
    }

    loadTheme();
  }, [loadTheme]);

  const setTheme = useCallback(
    async (name: ThemeName) => {
      broadcastTheme(name);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    },
    []
  );

  return {
    themeName,
    colors: THEMES[themeName],
    loading,
    setTheme,
    reload: loadTheme,
  };
}
