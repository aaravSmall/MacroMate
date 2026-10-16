/**
 * Design tokens. The palette is calm and neutral with a single accent.
 *
 * Deliberately absent: success/error colors for calorie status. Days and totals are never
 * colored good/bad (see docs/PRODUCT.md → Design principles). `danger` exists only for
 * destructive actions and form validation.
 */

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  onAccent: string;
  /** Single neutral color marking a logged day on the calendar. */
  logged: string;
  /** Destructive actions and form validation only, never calorie status. */
  danger: string;
};

export const lightColors: ColorTokens = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEFEC',
  border: '#E2E2DE',
  text: '#1C1C1A',
  textMuted: '#6B6B66',
  accent: '#2F7A6B',
  accentMuted: '#DCEBE7',
  onAccent: '#FFFFFF',
  logged: '#8A8A84',
  danger: '#B3452F',
};

export const darkColors: ColorTokens = {
  background: '#121211',
  surface: '#1C1C1A',
  surfaceMuted: '#262624',
  border: '#33332F',
  text: '#F2F2EF',
  textMuted: '#A3A39C',
  accent: '#5FB3A1',
  accentMuted: '#1F3530',
  onAccent: '#0E1F1B',
  logged: '#8F8F88',
  danger: '#E07A63',
};

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  subheading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
} as const;

export type TypographyVariant = keyof typeof typography;

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
};
