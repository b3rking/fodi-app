/**
 * Theme palettes and scheme resolution.
 *
 * Pure: no React, no Expo imports. The resolution rule is small but it is the
 * thing users get wrong, so it is unit tested.
 */

export type ThemeMode = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

export interface Colors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  good: string;
  goodDim: string;
  warn: string;
  warnDim: string;
  bad: string;
  badDim: string;
  accent: string;
  accentDim: string;
  /** Dimmed backdrop behind a bottom sheet. */
  scrim: string;
}

/**
 * The default. Dark, because this is read at night in a car: a bright screen
 * in the dark is both uncomfortable and a tell.
 */
export const darkColors: Colors = {
  bg: '#0B0F14',
  surface: '#141A22',
  surfaceAlt: '#1C2430',
  border: '#26303D',
  text: '#F2F5F8',
  textMuted: '#8A97A6',
  textFaint: '#5A6673',
  good: '#2FBF71',
  goodDim: '#12341F',
  warn: '#E8A33D',
  warnDim: '#33260F',
  bad: '#E5484D',
  badDim: '#3A1517',
  accent: '#3B82F6',
  accentDim: '#12233F',
  scrim: '#000000AA',
};

/**
 * Light is not an inversion. The verdict colours are darkened so they still
 * pass contrast against white, and the dim variants stay tinted rather than
 * washed out.
 */
export const lightColors: Colors = {
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EAEFF5',
  border: '#D3DCE6',
  text: '#0E1720',
  textMuted: '#55626F',
  textFaint: '#8492A0',
  good: '#0F7A46',
  goodDim: '#DCF1E6',
  warn: '#8A5A00',
  warnDim: '#FBEFD6',
  bad: '#BE262C',
  badDim: '#FAE1E2',
  accent: '#1B4DD8',
  accentDim: '#E2E9FD',
  // Lighter than the dark theme: a heavy black over a white sheet feels
  // like a modal error, and hides the sheet he is trying to read.
  scrim: '#1F293355',
};

export const palettes: Record<Scheme, Colors> = {
  dark: darkColors,
  light: lightColors,
};

/**
 * The one rule: follow the system unless he has said otherwise.
 *
 * When the OS has not told us yet (null, common on first frame), fall back to
 * dark rather than flashing white at a driver at 5am.
 */
export function resolveScheme(
  mode: ThemeMode,
  // React Native can report 'unspecified' as well as null, so accept any string.
  system: string | null | undefined
): Scheme {
  if (mode === 'light' || mode === 'dark') return mode;
  return system === 'light' ? 'light' : 'dark';
}

/** Verdict colours are theme-aware because contrast has to survive the switch. */
export type VerdictKey =
  | 'making_money'
  | 'breaking_even'
  | 'losing_money'
  | 'not_enough_data';

export function verdictColors(colors: Colors): Record<VerdictKey, { fg: string; bg: string }> {
  return {
    making_money: { fg: colors.good, bg: colors.goodDim },
    breaking_even: { fg: colors.warn, bg: colors.warnDim },
    losing_money: { fg: colors.bad, bg: colors.badDim },
    not_enough_data: { fg: colors.textMuted, bg: colors.surfaceAlt },
  };
}

export const THEME_MODE_KEY = 'theme_mode';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}