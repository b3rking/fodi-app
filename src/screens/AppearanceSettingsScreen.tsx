import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { IconButton } from '../components/buttons';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { AccentPicker } from '../components/AccentPicker';
import { fr } from '../i18n/fr';

/** Réglages d'apparence : thème + couleur d'accent. */
export function AppearanceSettingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View className="flex-row items-center gap-3">
        <IconButton label={fr.settings.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={isDark ? '#FFFFFF' : '#000000'} />
        </IconButton>
        <Text className="font-700 text-3xl text-black dark:text-white">
          {fr.settings.appearanceMenuTitle}
        </Text>
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.themeTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.themeDescription}
        </Text>
        <ThemeSwitcher />
        <Text className="font-500 mt-2 text-base text-black dark:text-white">
          {fr.accentTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.accentHint}
        </Text>
        <AccentPicker />
      </View>
    </ScrollView>
  );
}
