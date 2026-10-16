import '../global.css';
import React, { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import * as SystemUI from 'expo-system-ui';
import { useThemeStore } from '../src/store/themeStore';
import { useFuelStore } from '../src/store/fuelStore';
import { useTripsStore } from '../src/store/tripsStore';
import { useMoneyStore } from '../src/store/moneyStore';
import { useWorkdayStore } from '../src/store/workdayStore';
import { NavFab } from '../src/components/NavFab';
import { Toast } from '../src/components/Toast';
import { LockScreen } from '../src/components/LockScreen';
import { darkPalette, lightPalette } from '../src/core/theme';
import { fr } from '../src/i18n/fr';
import { isLockEnabled, recordActivity, shouldAutoLock, getLockTimeoutMs, setCurrentTimeout } from '../src/core/lock';
import { initDatabase } from '../src/db/database';

/**
 * Racine de la navigation : habillage commun à toutes les routes
 * (zone sûre, barre système, thème, chargement des polices et de la base).
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Roboto-Regular': require('@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf'),
    'Roboto-Medium': require('@expo-google-fonts/roboto/500Medium/Roboto_500Medium.ttf'),
    'Roboto-Bold': require('@expo-google-fonts/roboto/700Bold/Roboto_700Bold.ttf'),
  });

  const mode = useThemeStore((s) => s.mode);
  const loadAccent = useThemeStore((s) => s.loadAccent);
  const { colorScheme, setColorScheme } = useColorScheme();
  const fuelReady = useFuelStore((s) => s.ready);
  const loadFuel = useFuelStore((s) => s.load);
  const tripsReady = useTripsStore((s) => s.ready);
  const loadTrips = useTripsStore((s) => s.load);
  const moneyReady = useMoneyStore((s) => s.ready);
  const loadMoney = useMoneyStore((s) => s.load);
  const workdayReady = useWorkdayStore((s) => s.ready);
  const loadWorkday = useWorkdayStore((s) => s.load);
  const [locked, setLocked] = useState(false);

  // Synchronise le mode choisi avec NativeWind (qui ajoute/retire la classe `dark`).
  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  const isDark = colorScheme === 'dark';
  const palette = isDark ? darkPalette : lightPalette;

  // Teinte les surfaces natives (fond de fenêtre derrière la barre de statut
  // et la barre de navigation) avec la couleur de surface du thème.
  // Placé avant le retour anticipé : les hooks doivent s'exécuter à chaque rendu.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.surface);
  }, [palette.surface]);

  // Base locale (SQLite) : tous les modules + réglages.
  useEffect(() => {
    void loadFuel();
    void loadTrips();
    void loadMoney();
    void loadWorkday();
    void loadAccent();
  }, [loadFuel, loadTrips, loadMoney, loadWorkday, loadAccent]);

  // Verrouillage : attend l'init de la base, puis vérifie une seule fois.
  // Charge aussi le délai configuré en mémoire pour shouldAutoLock().
  const [dbReady, setDbReady] = useState(false);
  useEffect(() => {
    void initDatabase().then(() => {
      setDbReady(true);
      void getLockTimeoutMs().then((ms) => setCurrentTimeout(ms));
      void isLockEnabled().then((enabled) => {
        if (enabled) setLocked(true);
      });
    });
  }, []);

  // Auto-lock après le délai configuré (défaut 5 min).
  // Vérifie à chaque tick si le timeout d'inactivité est écoulé,
  // pas seulement si un PIN est défini.
  useEffect(() => {
    const timer = setInterval(() => {
      if (locked) return;
      void isLockEnabled().then((enabled) => {
        if (enabled && shouldAutoLock()) setLocked(true);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [locked]);

  // Enregistre l'activité utilisateur pour l'auto-lock.
  useEffect(() => {
    const { AppState } = require('react-native');
    const sub = AppState.addEventListener('change', (state: string) => {
      if (state === 'active') recordActivity();
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || !fuelReady || !tripsReady || !moneyReady || !workdayReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="font-400 text-base text-neutral-600 dark:text-neutral-300">
          {fr.fuel.loading}
        </Text>
      </View>
    );
  }

  if (locked) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black">
        <LockScreen
          onUnlock={() => {
            recordActivity();
            setLocked(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <Slot />
      <NavFab />
      <Toast />
      <StatusBar
        animated
        translucent={false}
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={palette.surface}
      />
    </SafeAreaView>
  );
}
