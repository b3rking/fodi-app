import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { Fuel } from 'lucide-react-native';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { useThemeStore } from './store/themeStore';
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

  if (!fontsLoaded) {
    return null;
  }

  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 items-center justify-center gap-6 px-6">
        <View className="items-center gap-2">
          <Fuel size={40} color={isDark ? '#FF9800' : '#FF5722'} />
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

        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    </SafeAreaView>
  );
}
