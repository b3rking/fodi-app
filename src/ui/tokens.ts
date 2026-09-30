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

/**
 * Product Sans.
 *
 * Weights actually shipped with the font are 400, 500 and 700 only. Android
 * fakes any other weight, and fake bold on large numbers looks smeared, so
 * every style maps onto a real weight rather than inventing one.
 */
export const FONT_FAMILY = {
  regular: 'ProductSans_400Regular',
  medium: 'ProductSans_500Medium',
  bold: 'ProductSans_700Bold',
} as const;

export const font = {
  hero: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 44,
    letterSpacing: -1,
  },
  title: { fontFamily: FONT_FAMILY.bold, fontSize: 20 },
  body: { fontFamily: FONT_FAMILY.regular, fontSize: 16 },
  bodyStrong: { fontFamily: FONT_FAMILY.medium, fontSize: 16 },
  small: { fontFamily: FONT_FAMILY.regular, fontSize: 14 },
  tiny: { fontFamily: FONT_FAMILY.medium, fontSize: 12 },
  /** Section headers read as labels, not headlines. */
  label: { fontFamily: FONT_FAMILY.bold, fontSize: 12, letterSpacing: 1 },
} as const;

/** Tab bar labels and system chrome use the same family. */
export const chromeFont = {
  fontFamily: FONT_FAMILY.medium,
  fontSize: 11,
} as const;

/**
 * Vertical room a scroll view must leave at the bottom.
 *
 * On Android the app draws edge-to-edge, so a scrolling screen extends behind
 * the tab bar. Without this the last card sits under the buttons.
 */
export const TAB_BAR_CLEARANCE = 92;