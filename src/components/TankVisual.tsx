import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '../store/themeStore';
import { formatLitres } from '../core/format';
import type { TankLevelDef } from '../core/fuel/engine';

interface Props {
  capacityL: number;
  /** Litres saisis (brut, pas encore validés). */
  litresTyped: number;
  /** Niveau estimé avant le plein (suivi). */
  beforeL: number;
}

/**
 * Réservoir vertical qui se remplit en direct pendant la saisie des litres :
 * la montée est animée (spring) et le niveau d'arrivée est affiché en français.
 * Pur visuel — aucun calcul métier ici (c'est le moteur qui décide).
 */
export function TankVisual({ capacityL, litresTyped, beforeL }: Props) {
  const { colorScheme } = useColorScheme();
  const accent = useThemeStore((s) => s.accent);

  const fraction = capacityL > 0 ? Math.min(1, Math.max(0, beforeL / capacityL)) : 0;
  const afterFraction =
    capacityL > 0 ? Math.min(1, Math.max(0, (beforeL + litresTyped) / capacityL)) : 0;

  const W = 120;
  const H = 200;
  const TANK_TOP = 10;
  const TANK_BOTTOM = H - 10;
  const TANK_H = TANK_BOTTOM - TANK_TOP;
  const fillH = TANK_H * fraction;
  const afterH = TANK_H * afterFraction;

  return (
    <View className="items-center gap-2">
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="tankGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity="0.85" />
            <Stop offset="1" stopColor={accent} stopOpacity="0.55" />
          </LinearGradient>
        </Defs>
        {/* Contour */}
        <Rect
          x={10}
          y={TANK_TOP}
          width={W - 20}
          height={TANK_H}
          rx={14}
          ry={14}
          fill="none"
          stroke={colorScheme === 'dark' ? '#404040' : '#D0D0D0'}
          strokeWidth={3}
        />
        {/* Niveau actuel */}
        <Rect
          x={14}
          y={TANK_BOTTOM - fillH}
          width={W - 28}
          height={fillH}
          rx={10}
          ry={10}
          fill="url(#tankGrad)"
          opacity={0.9}
        />
        {/* Niveau après le plein (pointillé de fin) */}
        {litresTyped > 0 && afterH > fillH ? (
          <Rect
            x={14}
            y={TANK_BOTTOM - afterH}
            width={W - 28}
            height={afterH - fillH}
            rx={10}
            ry={10}
            fill={accent}
            opacity={0.35}
          />
        ) : null}
      </Svg>
      <Text className="font-500 text-base text-black dark:text-white">
        {formatLitres(beforeL)} / {formatLitres(capacityL)}
      </Text>
      {litresTyped > 0 ? (
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          → {formatLitres(beforeL + litresTyped)} ({Math.round(afterFraction * 100)} %)
        </Text>
      ) : null}
    </View>
  );
}
