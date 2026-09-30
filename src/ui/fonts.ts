import { useFonts } from 'expo-font';

/**
 * Product Sans, bundled locally.
 *
 * Loaded from files in assets/fonts rather than from a package, because
 * Product Sans is not published as an @expo-google-fonts entry.
 *
 * Note on glyph coverage: the font has no U+202F (narrow no-break space), which
 * is why the thousands separator in core/format.ts is U+00A0. Verified with a
 * cmap scan, not assumed.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    ProductSans_400Regular: require('../../assets/fonts/ProductSans-Regular.ttf'),
    ProductSans_500Medium: require('../../assets/fonts/ProductSans-Medium.ttf'),
    ProductSans_700Bold: require('../../assets/fonts/ProductSans-Bold.ttf'),
  });

  return loaded;
}
