// Morning Paper — Chocolate Brown Theme
export const Colors = {
  // Arka planlar
  background: '#FAF0D7',
  surface: '#FDF6E3',
  surfaceHigh: '#EDE0CC',
  surfaceInput: '#EDE0CC',

  // Çizgiler
  border: '#D4B896',
  borderSubtle: '#E8D5B0',

  // Metinler
  textPrimary: '#3B2A1A',
  textSecondary: '#7A5C3A',
  textMuted: '#A08060',

  // Accent
  accent: '#3D2B1F',
  accentLight: '#C4A882',

  // Durum renkleri
  success: '#2D6A4F',
  warning: '#DBBC7F',
  error: '#C0450A',
  info: '#1B3A6B',
  white: '#FDF6E3',
  black: '#1A0F08',
  transparent: 'transparent',
} as const;

export const Typography = {
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '600' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;