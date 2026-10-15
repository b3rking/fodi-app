import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Minus, Plus } from 'lucide-react-native';
import {
  levelsForBarCount,
  MAX_TANK_LEVELS,
  MIN_TANK_LEVELS,
  type TankLevelDef,
} from '../core/fuel/engine';
import { fr } from '../i18n/fr';

interface Props {
  levels: TankLevelDef[];
  onChange: (levels: TankLevelDef[]) => void;
}

/**
 * Choix du nombre de barres (comme la jauge de la voiture) : les niveaux
 * sont générés régulièrement, sans rien taper. Les noms restent modifiables.
 */
export function LevelsEditor({ levels, onChange }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#FFFFFF' : '#000000';

  const setCount = (count: number) => {
    if (count < MIN_TANK_LEVELS || count > MAX_TANK_LEVELS) return;
    onChange(levelsForBarCount(count));
  };

  const rename = (id: string, label: string) => {
    onChange(levels.map((l) => (l.id === id ? { ...l, label } : l)));
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

      {levels.map((level) => (
        <View key={level.id} className="flex-row items-center gap-2">
          <Text className="font-500 w-16 text-center text-sm text-neutral-600 dark:text-neutral-300">
            {Math.round(level.fraction * 100)} %
          </Text>
          <TextInput
            value={level.label}
            onChangeText={(v) => rename(level.id, v)}
            placeholder={fr.settings.levelName}
            placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
            className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
          />
        </View>
      ))}
    </View>
  );
}
