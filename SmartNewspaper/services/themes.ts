export type ThemeName = 'stone' | 'sunset' | 'midnight';

export interface ThemeColors {
  // Arka planlar
  background: string;
  surface: string;
  surfaceHigh: string;
  surfaceInput: string;

  // Çizgiler
  border: string;
  borderSubtle: string;

  // Metinler
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent
  accent: string;
  accentLight: string;

  // Durum renkleri
  success: string;
  warning: string;
  error: string;
  info: string;
  white: string;
  black: string;
  transparent: string;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  // Morning Paper — Chocolate Brown Theme
  stone: {
    background: '#FAF0D7',
    surface: '#FDF6E3',
    surfaceHigh: '#EDE0CC',
    surfaceInput: '#EDE0CC',
    border: '#D4B896',
    borderSubtle: '#E8D5B0',
    textPrimary: '#3B2A1A',
    textSecondary: '#7A5C3A',
    textMuted: '#A08060',
    accent: '#3D2B1F',
    accentLight: '#C4A882',
    success: '#2D6A4F',
    warning: '#DBBC7F',
    error: '#C0450A',
    info: '#1B3A6B',
    white: '#FDF6E3',
    black: '#1A0F08',
    transparent: 'transparent',
  },

  // Clean Slate Theme
  sunset: {
    background: '#ECEFF3',
    surface: '#F7F8FA',
    surfaceHigh: '#FFFFFF',
    surfaceInput: '#EEF1F5',
    border: '#CCD3DD',
    borderSubtle: '#DCE2EA',
    textPrimary: '#1B2430',
    textSecondary: '#3A4657',
    textMuted: '#6B7788',
    accent: '#2E5B9A',
    accentLight: '#6F8FBD',
    success: '#2F7D57',
    warning: '#C7922D',
    error: '#C14B4B',
    info: '#3E6FB3',
    white: '#FFFFFF',
    black: '#0F1621',
    transparent: 'transparent',
  },

  // Midnight Ink Theme
  midnight: {
    background: '#0F0F1A',
    surface: '#1A1A2E',
    surfaceHigh: '#252541',
    surfaceInput: '#252541',
    border: '#3A3A54',
    borderSubtle: '#5A5A78',
    textPrimary: '#E8E8F0',
    textSecondary: '#C0C0D0',
    textMuted: '#8B8BA8',
    accent: '#5442F5',
    accentLight: '#7062FF',
    success: '#2D6A4F',
    warning: '#F5A623',
    error: '#FF6B6B',
    info: '#4F7DE5',
    white: '#E8E8F0',
    black: '#0F0F1A',
    transparent: 'transparent',
  },
};

export const THEME_NAMES: ThemeName[] = ['stone', 'sunset', 'midnight'];

export const THEME_LABELS: Record<ThemeName, string> = {
  stone: 'Taş Kahve',
  sunset: 'Clean Slate',
  midnight: 'Gece Mürekkebi',
};
