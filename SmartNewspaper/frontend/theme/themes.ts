export type ThemeName = 'sunset' | 'midnight' | 'vincent';

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

  // Vincent Theme
  vincent: {
    background: '#FDF6E3',
    surface: '#EEE8D5',
    surfaceHigh: '#F6EEDC',
    surfaceInput: '#EEE8D5',
    border: '#C4A88A',
    borderSubtle: '#EEE8D5',
    textPrimary: 'rgba(17, 17, 17, 0.82)',
    textSecondary: '#555555',
    textMuted: '#555555',
    accent: '#073642',
    accentLight: '#C4A88A',
    success: '#073642',
    warning: '#C4A88A',
    error: '#3E2B1F',
    info: '#073642',
    white: '#FDF6E3',
    black: '#3E2B1F',
    transparent: 'transparent',
  },
};

export const THEME_NAMES: ThemeName[] = ['sunset', 'midnight', 'vincent'];

export const THEME_LABELS: Record<ThemeName, string> = {
  sunset: 'Clean Slate',
  midnight: 'Gece Mürekkebi',
  vincent: 'Vincent',
};
