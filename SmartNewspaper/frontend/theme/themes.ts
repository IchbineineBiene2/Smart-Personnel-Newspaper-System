export type ThemeName = 'midnight' | 'emerald' | 'mars' | 'cyber' | 'sunset' | 'vincent';

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

export const darkTheme: ThemeColors = {
  // Haberdar Midnight Theme
  background: '#070A12',
  surface: '#151821',
  surfaceHigh: '#222530',
  surfaceInput: '#1B1E28',
  border: '#353947',
  borderSubtle: '#2A2E3A',
  textPrimary: '#F5F7FB',
  textSecondary: '#AAB7CC',
  textMuted: '#6F80A0',
  accent: '#6254FF',
  accentLight: '#7D72FF',
  success: '#13C38B',
  warning: '#F4B740',
  error: '#FF3B6B',
  info: '#73A7FF',
  white: '#FFFFFF',
  black: '#05060B',
  transparent: 'transparent',
};

export const THEMES: Record<ThemeName, ThemeColors> = {
  // Gazete.AI Midnight Theme
  midnight: {
    background: '#080A12',
    surface: '#151821',
    surfaceHigh: '#222530',
    surfaceInput: '#1B1E28',
    border: '#353947',
    borderSubtle: '#2A2E3A',
    textPrimary: '#F5F7FB',
    textSecondary: '#AAB7CC',
    textMuted: '#6F80A0',
    accent: '#6254FF',
    accentLight: '#7D72FF',
    success: '#13C38B',
    warning: '#F4B740',
    error: '#FF3B6B',
    info: '#73A7FF',
    white: '#FFFFFF',
    black: '#05060B',
    transparent: 'transparent',
  },

  // Emerald Forest Theme
  emerald: {
    background: '#06110E',
    surface: '#111C18',
    surfaceHigh: '#1B2A24',
    surfaceInput: '#15221D',
    border: '#284239',
    borderSubtle: '#1F332C',
    textPrimary: '#F2FBF7',
    textSecondary: '#ABC5BA',
    textMuted: '#6F8C81',
    accent: '#10B981',
    accentLight: '#34D399',
    success: '#22C55E',
    warning: '#EAB308',
    error: '#F43F5E',
    info: '#38BDF8',
    white: '#FFFFFF',
    black: '#020806',
    transparent: 'transparent',
  },

  // Red Mars Theme
  mars: {
    background: '#12080D',
    surface: '#1E1218',
    surfaceHigh: '#2A1A22',
    surfaceInput: '#24161D',
    border: '#4B2C38',
    borderSubtle: '#38222C',
    textPrimary: '#FFF6F8',
    textSecondary: '#D4AAB5',
    textMuted: '#9A6D79',
    accent: '#F43F5E',
    accentLight: '#FB7185',
    success: '#2DD4BF',
    warning: '#F59E0B',
    error: '#FF3B6B',
    info: '#A78BFA',
    white: '#FFFFFF',
    black: '#080307',
    transparent: 'transparent',
  },

  // Cyber Punk Theme
  cyber: {
    background: '#061018',
    surface: '#101B25',
    surfaceHigh: '#182838',
    surfaceInput: '#132232',
    border: '#254056',
    borderSubtle: '#1D3448',
    textPrimary: '#F0FBFF',
    textSecondary: '#A5C4D5',
    textMuted: '#6D8FA3',
    accent: '#06B6D4',
    accentLight: '#22D3EE',
    success: '#10B981',
    warning: '#FACC15',
    error: '#FB3B76',
    info: '#60A5FA',
    white: '#FFFFFF',
    black: '#02070B',
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

export const THEME_NAMES: ThemeName[] = ['midnight', 'emerald', 'mars', 'cyber', 'vincent'];

export const THEME_LABELS: Record<ThemeName, string> = {
  sunset: 'Clean Slate',
  midnight: 'Gece Yarısı',
  emerald: 'Zümrüt Ormanı',
  mars: 'Kızıl Mars',
  cyber: 'Siber Punk',
  vincent: 'Vincent',
};
