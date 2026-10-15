import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Minus, Plus } from 'lucide-react-native';
import {
  formatLevelLabel,
  levelsForBarCount,
  MAX_TANK_LEVELS,
  MIN_TANK_LEVELS,
  type LevelLabelStyle,
  type TankLevelDef,
} from '../core/fuel/engine';
import { fr } from '../i18n/fr';

interface Props {
  levels: TankLevelDef[];
  /** Format d'aperçu (brouillon du même écran, pas encore enregistré). */
  format: LevelLabelStyle;
  onChange: (levels: TankLevelDef[]) => void;
}

/**
 * Choix du nombre de barres (comme la jauge de la voiture) : les niveaux
 * sont générés régulièrement, sans rien taper. Aperçu dans le format choisi.
 */
export function LevelsEditor({ levels, format, onChange }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#FFFFFF' : '#000000';

  const setCount = (count: number) => {
    if (count < MIN_TANK_LEVELS || count > MAX_TANK_LEVELS) return;
    onChange(levelsForBarCount(count));
  };

  return (
    <View style={{ gap: 8 }}>
      <Text className="font-500 text-base text-black dark:text-white">
        {fr.settings.levelsTitle}
      </Text>
      <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
        {fr.settings.levelsHint}
      </Text>

      <View className="flex-row items-center justify-between rounded-2xl bg-neutral-200 px-2 py-1 dark:bg-neutral-700">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.settings.fewerBars}
          onPress={() => setCount(levels.length - 1)}
          className="rounded-full p-2"
        >
          <Minus size={20} color={iconColor} />
        </Pressable>
        <Text className="font-700 text-lg text-black dark:text-white">
          {levels.length} {fr.settings.bars}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.settings.moreBars}
          onPress={() => setCount(levels.length + 1)}
          className="rounded-full p-2"
        >
          <Plus size={20} color={iconColor} />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {[...levels]
          .sort((a, b) => a.fraction - b.fraction)
          .map((level) => (
            <View
              key={level.id}
              className="rounded-xl bg-neutral-200 px-3 py-2 dark:bg-neutral-700"
              style={{ flexGrow: 1, alignItems: 'center' }}
            >
              <Text className="font-500 text-sm text-black dark:text-white">
                {formatLevelLabel(level.fraction, format)}
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}
