import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Check, ChevronRight, Monitor, Moon, Settings, Sun, User } from 'lucide-react-native';
import { themeModes, themeModeLabels, type ThemeMode } from '../core/theme';
import { useThemeStore } from '../store/themeStore';
import { fr } from '../i18n/fr';

const themeIcons = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

/**
 * Icône utilisateur dans l'en-tête : ouvre un menu avec le choix
 * d'apparence et un lien vers les paramètres.
 */
export function UserMenu() {
  const [open, setOpen] = useState(false);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  // Les icônes Lucide ignorent la couleur du texte parent : couleur explicite.
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  const goSettings = () => {
    setOpen(false);
    router.push('/settings');
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fr.menu.openLabel}
        onPress={() => setOpen(true)}
        className="rounded-full bg-neutral-100 p-2 text-black dark:bg-neutral-800 dark:text-white"
      >
        <User size={22} color={iconColor} />
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.menu.openLabel}
          onPress={() => setOpen(false)}
          className="flex-1 bg-black/30"
        >
          <View className="absolute right-4 top-16 w-64 gap-1 rounded-2xl bg-white p-2 dark:bg-neutral-900">
            <Text className="font-500 px-3 pb-1 pt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {fr.menu.appearance}
            </Text>
            {themeModes.map((option) => {
              const selected = option === mode;
              const Icon = themeIcons[option];
              return (
                <Pressable
                  // Remontage propre à chaque changement (cf. ThemeSwitcher).
                  key={`${option}-${selected ? 'on' : 'off'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Thème ${themeModeLabels[option]}`}
                  onPress={() => setMode(option)}
                  className={
                    selected
                      ? 'flex-row items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-black dark:bg-neutral-800 dark:text-white'
                      : 'flex-row items-center gap-2 rounded-xl px-3 py-2 text-black dark:text-white'
                  }
                >
                  <Icon size={18} color={iconColor} />
                  <Text className="font-500 flex-1 text-base text-black dark:text-white">
                    {themeModeLabels[option]}
                  </Text>
                  {selected ? <Check size={18} color={iconColor} /> : null}
                </Pressable>
              );
            })}

            <View className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.menu.settings}
              onPress={goSettings}
              className="flex-row items-center gap-2 rounded-xl px-3 py-2 text-black dark:text-white"
            >
              <Settings size={18} color={iconColor} />
              <Text className="font-500 flex-1 text-base text-black dark:text-white">
                {fr.menu.settings}
              </Text>
              <ChevronRight size={18} color={iconColor} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
