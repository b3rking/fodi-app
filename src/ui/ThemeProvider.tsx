import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  isThemeMode,
  palettes,
  resolveScheme,
  verdictColors,
  type Colors,
  type Scheme,
  type ThemeMode,
  type VerdictKey,
} from '../core/theme';
import { getSetting, setSetting } from '../db/queries';
import { useAppStore } from '../store/useAppStore';

interface ThemeValue {
  colors: Colors;
  verdict: Record<VerdictKey, { fg: string; bg: string }>;
  scheme: Scheme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Follows the system by default, with an override the driver can set once.
 *
 * The preference is persisted in the same local SQLite file as everything else,
 * because there is no account and no server to sync with.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const db = useAppStore((s) => s.db);
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load the saved preference once the database is open. 'system' until then,
  // so the very first frame is already correct on a dark phone.
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    void getSetting(db, 'theme_mode').then((stored) => {
      if (!cancelled && isThemeMode(stored)) setModeState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      const database = useAppStore.getState().db;
      if (database) void setSetting(database, 'theme_mode', next);
    },
    []
  );

  const scheme = resolveScheme(mode, system);
  const colors = palettes[scheme];

  const value = useMemo<ThemeValue>(
    () => ({ colors, verdict: verdictColors(colors), scheme, mode, setMode }),
    [colors, scheme, mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

/**
 * Build a StyleSheet for the active palette, rebuilt only when the theme
 * changes.
 *
 * `factory` must be a module-scope function (not an inline arrow) so its
 * identity is stable and the memo actually holds.
 */
export function useThemedStyles<T>(factory: (colors: Colors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}