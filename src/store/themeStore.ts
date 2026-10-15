import { create } from 'zustand';
import { DEFAULT_ACCENT, getAccentColor, isAccentColor, setAccentColor as dbSetAccentColor } from '../db/database';
import { nextToggleMode, type ThemeMode } from '../core/theme';

interface ThemeState {
  /** Mode choisi par l'utilisateurice. */
  mode: ThemeMode;
  /** Applique un mode (la synchronisation NativeWind se fait dans le composant). */
  setMode: (mode: ThemeMode) => void;
  /** Bascule rapide clair <-> sombre. */
  toggle: () => void;
  /** Couleur d'accent appliquée à toute l'app. */
  accent: string;
  /** Charge l'accent persisté (au démarrage). */
  loadAccent: () => Promise<void>;
  /** Applique et persiste une couleur (#RRGGBB). */
  setAccent: (color: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  setMode: (mode) => set({ mode }),
  toggle: () => set({ mode: nextToggleMode(get().mode) }),
  accent: DEFAULT_ACCENT,
  loadAccent: async () => {
    set({ accent: await getAccentColor() });
  },
  setAccent: async (color) => {
    if (!isAccentColor(color)) {
      throw new Error('Code couleur invalide (ex. #FF9800).');
    }
    await dbSetAccentColor(color);
    set({ accent: color.toUpperCase() });
  },
}));
