import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
<<<<<<< HEAD
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '../ui/ThemeProvider';
import { useAppFonts } from '../ui/fonts';
import { useAppStore } from '../store/useAppStore';

// Enregistre Tailwind auprès de NativeWind. À importer une seule fois, à la racine.
import '../../global.css';

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  // Retenir la première image jusqu'à ce que la police soit en mémoire, sinon
  // chaque nombre se recompose visiblement à son arrivée.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
=======
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '../ui/ThemeProvider';
import { useAppStore } from '../store/useAppStore';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarAdapter />
        <StackHost />
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

<<<<<<< HEAD
function ThemedApp() {
  const { colors, scheme } = useTheme();
=======
function StatusBarAdapter() {
  const { scheme } = useTheme();
  // Follow the theme so the bar is not white-on-white in light mode.
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

function StackHost() {
  const { colors } = useTheme();
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

<<<<<<< HEAD
  // Android est en edge-to-edge : la barre d'état et la barre de gestes sont
  // transparentes et laissent voir le fond de la fenêtre. Sans ceci, le haut
  // de l'écran reste noir en mode clair et les icônes sombres deviennent
  // invisibles dessus. C'est la correction.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  return (
    // Peint toute la fenêtre, y compris derrière les barres système, pour
    // qu'il n'y ait pas de bandeau noir en haut ni en bas en mode clair.
    <View className="flex-1 bg-bg">
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'ProductSans_700Bold' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="first-run" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
=======
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="first-run" options={{ headerShown: false }} />
    </Stack>
  );
}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
