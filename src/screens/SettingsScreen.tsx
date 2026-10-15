import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronRight, Fuel } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { IconButton } from '../components/buttons';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { fr } from '../i18n/fr';

const ACCENT_PRESETS = ['#FF9800', '#FF5722', '#2E7D32', '#1E88E5', '#8E24AA', '#E53935'];

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

function AccentPicker() {
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);
  const showToast = useToastStore((s) => s.show);

  const apply = (color: string) => {
    void setAccent(color).then(() => showToast(fr.toast.settingsSaved));
  };

  return (
    <View className="flex-row gap-2">
      {ACCENT_PRESETS.map((color) => {
        const selected = accent.toUpperCase() === color;
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={color}
            accessibilityState={{ selected }}
            onPress={() => apply(color)}
            className="h-10 flex-1 items-center justify-center rounded-full"
            style={{
              backgroundColor: color,
              borderWidth: selected ? 3 : 0,
              borderColor: '#FFFFFF',
            }}
          >
            {selected ? <Check size={18} color="#FFFFFF" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
