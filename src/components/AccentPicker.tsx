import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { fr } from '../i18n/fr';

const ACCENT_PRESETS = ['#FF9800', '#FF5722', '#2E7D32', '#1E88E5', '#8E24AA', '#E53935'];

/** Choix de la couleur d'accent (persistée, appliquée à toute l'app). */
export function AccentPicker() {
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
