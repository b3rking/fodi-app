import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import * as SystemUI from 'expo-system-ui';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { useThemeStore } from './store/themeStore';
import { darkPalette, lightPalette } from './core/theme';
import { fr } from './i18n/fr';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Roboto-Regular': require('@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf'),
    'Roboto-Medium': require('@expo-google-fonts/roboto/500Medium/Roboto_500Medium.ttf'),
    'Roboto-Bold': require('@expo-google-fonts/roboto/700Bold/Roboto_700Bold.ttf'),
  });

  const mode = useThemeStore((s) => s.mode);
  const { colorScheme, setColorScheme } = useColorScheme();

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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 items-center justify-center gap-6 px-6">
        <View className="items-center gap-2">
          <Text className="font-700 text-4xl text-black dark:text-white">
            {fr.appName}
          </Text>
          <Text className="font-400 text-center text-base text-neutral-600 dark:text-neutral-300">
            {fr.tagline}
          </Text>
        </View>

        <View className="w-full gap-2">
          <Text className="font-500 text-lg text-black dark:text-white">
            {fr.themeTitle}
          </Text>
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.themeDescription}
          </Text>
          <ThemeSwitcher />
        </View>

        <StatusBar
          animated
          translucent={false}
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={palette.surface}
        />
      </View>
    </SafeAreaView>
  );
}
