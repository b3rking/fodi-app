import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Monitor, Moon, Sun } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { themeModes, themeModeLabels, type ThemeMode } from '../core/theme';
import { useThemeStore } from '../store/themeStore';

const icons = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

/**
 * Sélecteur d'apparence à trois positions : Système / Clair / Sombre.
 * Libellés en français, accessible via `accessibilityLabel`.
 */
export function ThemeSwitcher() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { colorScheme } = useColorScheme();
  // Les icônes Lucide ignorent la couleur du texte parent : couleur explicite.
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Choix de l’apparence"
      className="flex-row rounded-full bg-gray-200 p-1 dark:bg-neutral-800"
    >
      {themeModes.map((option) => {
        const selected = option === mode;
        const Icon = icons[option];
        return (
          <Pressable
            // La sélection ajoute/retire des variantes `dark:` après le montage.
            // Sans cette clé, css-interop tente une mise à niveau à chaud et son
            // avertissement de dev plante en sérialisant les props (contexte
            // expo-router). La clé force un remontage propre avec les classes
            // finales dès le premier rendu.
            key={`${option}-${selected ? 'actif' : 'inactif'}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Thème ${themeModeLabels[option]}`}
            accessibilityHint="Appliquer ce thème à l’interface"
            onPress={() => setMode(option)}
            className={
              selected
                ? 'flex-1 flex-row items-center justify-center gap-1 rounded-full bg-white px-3 py-2 text-black shadow dark:bg-black dark:text-white'
                : 'flex-1 flex-row items-center justify-center gap-1 rounded-full px-3 py-2 text-neutral-500 dark:text-neutral-400'
            }
          >
            <Icon size={18} color={selected ? iconColor : '#737373'} />
            <Text
              className={
                selected
                  ? 'font-500 text-sm text-black dark:text-white'
                  : 'font-500 text-sm text-neutral-500 dark:text-neutral-400'
              }
            >
              {themeModeLabels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
