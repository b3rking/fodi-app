import { create } from 'zustand';
import { nextToggleMode, type ThemeMode } from '../core/theme';

interface ThemeState {
  /** Mode choisi par l'utilisateurice. */
  mode: ThemeMode;
  /** Applique un mode (la synchronisation NativeWind se fait dans le composant). */
  setMode: (mode: ThemeMode) => void;
  /** Bascule rapide clair <-> sombre. */
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  setMode: (mode) => set({ mode }),
  toggle: () => set({ mode: nextToggleMode(get().mode) }),
}));
