export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

export const lightPalette = {
  surface: '#FFFFFF',
  ink: '#000000',
  line: '#E0E0E0',
  accent: '#FF5722',
  bg: '#F5F5F5',
  text: '#212121',
  disabled: '#BDBDBD',
};

export const darkPalette = {
  surface: '#121212',
  ink: '#FFFFFF',
  line: '#404040',
  accent: '#FF9800',
  bg: '#1E1E1E',
  text: '#E0E0E0',
  disabled: '#616161',
};

/** Libellés français des modes de thème. */
export const themeModeLabels: Record<ThemeMode, string> = {
  system: 'Système',
  light: 'Clair',
  dark: 'Sombre',
};

export const themeModes: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Résout le schéma effectif à partir du mode choisi et du schéma système.
 * Fonction pure, testée en isolation (aucune dépendance native).
 */
export function resolveScheme(
  mode: ThemeMode,
  systemScheme: ResolvedScheme | null | undefined,
): ResolvedScheme {
  if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return mode;
}

/** Bascule rapide clair <-> sombre (le mode système bascule vers clair). */
export function nextToggleMode(mode: ThemeMode): Exclude<ThemeMode, 'system'> {
  return mode === 'dark' ? 'light' : 'dark';
}
