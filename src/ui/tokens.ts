/**
 * Typography, spacing and radii.
 *
 * Colours are NOT here: they change at runtime with the theme, so they come
 * from `useTheme()`. Anything that needs a colour takes it from the palette.
 *
 * Android minimum comfortable target is 48dp; the action buttons go larger.
 */

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