/**
 * Design tokens.
 *
 * Dark first: a driver reads this at night in a car, and a bright screen at
 * night is both uncomfortable and a tell. Big type, big touch targets, and
 * colour used only for one thing at a time — the verdict.
 */

export const colors = {
  bg: '#0B0F14',
  surface: '#141A22',
  surfaceAlt: '#1C2430',
  border: '#26303D',

  text: '#F2F5F8',
  textMuted: '#8A97A6',
  textFaint: '#5A6673',

  /** Green / amber / red are reserved for the verdict. Nothing else uses them. */
  good: '#2FBF71',
  goodDim: '#12341F',
  warn: '#E8A33D',
  warnDim: '#33260F',
  bad: '#E5484D',
  badDim: '#3A1517',

  accent: '#3B82F6',
  accentDim: '#12233F',
} as const;

export const verdictColors = {
  making_money: { fg: colors.good, bg: colors.goodDim },
  breaking_even: { fg: colors.warn, bg: colors.warnDim },
  losing_money: { fg: colors.bad, bg: colors.badDim },
  not_enough_data: { fg: colors.textMuted, bg: colors.surfaceAlt },
} as const;

/** Android minimum comfortable target is 48dp; the action buttons go larger. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const font = {
  hero: { fontSize: 44, fontWeight: '800' as const, letterSpacing: -1 },
  title: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  small: { fontSize: 14, fontWeight: '400' as const },
  tiny: { fontSize: 12, fontWeight: '500' as const },
  /** Section headers read as labels, not headlines. */
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1 },
} as const;