import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Fuel } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { IconButton } from '../components/buttons';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { fr } from '../i18n/fr';

/** Paramètres : menu des modules (un écran de réglages par module). */
export function SettingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View className="flex-row items-center gap-3">
        <IconButton label={fr.settings.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={iconColor} />
        </IconButton>
        <Text className="font-700 text-3xl text-black dark:text-white">
          {fr.settings.title}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fr.settings.tankMenuTitle}
        onPress={() => router.push('/settings/tank' as '/')}
        className="flex-row items-center gap-3 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800"
      >
        <Fuel size={24} color={iconColor} />
        <View className="flex-1 gap-0">
          <Text className="font-500 text-base text-black dark:text-white">
            {fr.settings.tankMenuTitle}
          </Text>
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.settings.tankMenuDesc}
          </Text>
        </View>
        <ChevronRight size={20} color={iconColor} />
      </Pressable>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.themeTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.themeDescription}
        </Text>
        <ThemeSwitcher />
      </View>
    </ScrollView>
  );
}
