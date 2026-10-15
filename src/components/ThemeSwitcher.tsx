import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Monitor, Moon, Sun } from 'lucide-react-native';
import { themeModes, themeModeLabels, type ThemeMode } from '../core/theme';
import { useThemeStore } from '../store/themeStore';

const icons: Record<ThemeMode, React.ReactNode> = {
  system: <Monitor size={18} />,
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
};

/**
 * Sélecteur d'apparence à trois positions : Système / Clair / Sombre.
 * Libellés en français, accessible via `accessibilityLabel`.
 */
export function ThemeSwitcher() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Choix de l’apparence"
      className="flex-row rounded-full bg-gray-200 p-1 dark:bg-neutral-800"
    >
      {themeModes.map((option) => {
        const selected = option === mode;
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
            className={`flex-1 flex-row items-center justify-center gap-1 rounded-full px-3 py-2 ${
              selected ? 'bg-white shadow dark:bg-black' : ''
            }`}
          >
            {icons[option]}
            <Text
              className={`font-500 text-sm ${
                selected
                  ? 'text-black dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {themeModeLabels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
