import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
<<<<<<< HEAD
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
=======
import { useColorScheme } from 'react-native';
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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
<<<<<<< HEAD
  const system = useSystemColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
=======
  const system = useColorScheme();
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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

<<<<<<< HEAD
  const scheme = resolveScheme(mode, system);

  // Tell NativeWind which palette the `dark:` variants should compile against.
  // This is what makes className="bg-bg dark:bg-bg" follow the driver's choice
  // rather than only the OS setting.
  useEffect(() => {
    setColorScheme(scheme);
  }, [scheme, setColorScheme]);

=======
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      const database = useAppStore.getState().db;
      if (database) void setSetting(database, 'theme_mode', next);
    },
    []
  );

<<<<<<< HEAD
=======
  const scheme = resolveScheme(mode, system);
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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

<<<<<<< HEAD
=======
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
