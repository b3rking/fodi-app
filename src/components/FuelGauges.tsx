import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useThemeStore } from '../store/themeStore';
import { formatCurrentLevel, type LevelLabelStyle, type TankLevelDef } from '../core/fuel/engine';

interface GaugeProps {
  levels: TankLevelDef[];
  /** Fraction actuelle du réservoir, entre 0 et 1. */
  fraction: number;
  /** Couleur de piste (thémée par l'appelant). */
  trackColor: string;
  /** Format d'affichage du libellé (choisi en paramètres). */
  labelStyle: LevelLabelStyle;
}

/**
 * Jauge en barres debout, comme au tableau de bord : une barre allumée par
 * niveau atteint (y compris « Vide », toujours affiché). Aucune décimale inventée.
 */
export function BarsGauge({ levels, fraction, trackColor, labelStyle }: GaugeProps) {
  const sorted = [...levels].sort((a, b) => a.fraction - b.fraction);
  const accent = useThemeStore((s) => s.accent);
  return (
    <View>
      <Text className="font-700 text-2xl text-black dark:text-white">
        {formatCurrentLevel(levels, fraction, labelStyle)}
      </Text>
      <View className="mt-2 h-14 flex-row justify-between">
        {sorted.map((level) => {
          const on = level.fraction - fraction < 1e-9;
          return (
            <View
              key={level.id}
              style={{
                backgroundColor: on ? accent : trackColor,
                borderRadius: 9999,
                width: `${(100 / sorted.length) * 0.7}%`,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const DIAL_W = 220;
const DIAL_CX = 110;
const DIAL_CY = 104;
const DIAL_R = 86;

function dialPoint(fraction: number, radius: number): [number, number] {
  const angle = Math.PI * (1 - Math.min(1, Math.max(0, fraction)));
  return [DIAL_CX + radius * Math.cos(angle), DIAL_CY - radius * Math.sin(angle)];
}

/**
 * Jauge à aiguille : cadran semi-circulaire gradué à vos niveaux,
 * aiguille sur la fraction actuelle.
 */
export function NeedleGauge({ levels, fraction, trackColor, labelStyle }: GaugeProps) {
  const sorted = [...levels].sort((a, b) => a.fraction - b.fraction);
  const accent = useThemeStore((s) => s.accent);
  const [nx, ny] = dialPoint(fraction, DIAL_R - 22);
  const [ax, ay] = dialPoint(0, DIAL_R);
  const [bx, by] = dialPoint(1, DIAL_R);
  return (
    <View className="items-center">
      <Text className="font-700 text-2xl text-black dark:text-white">
        {formatCurrentLevel(levels, fraction, labelStyle)}
      </Text>
      <Svg width={DIAL_W} height={DIAL_CY + 8} viewBox={`0 0 ${DIAL_W} ${DIAL_CY + 8}`}>
        <Path
          d={`M ${ax} ${ay} A ${DIAL_R} ${DIAL_R} 0 0 1 ${bx} ${by}`}
          stroke={trackColor}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
        />
        {sorted.map((level) => {
          const [x1, y1] = dialPoint(level.fraction, DIAL_R - 8);
          const [x2, y2] = dialPoint(level.fraction, DIAL_R + 2);
          return (
            <Line
              key={level.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={trackColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
        <Line
          x1={DIAL_CX}
          y1={DIAL_CY}
          x2={nx}
          y2={ny}
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Circle cx={DIAL_CX} cy={DIAL_CY} r={7} fill={accent} />
      </Svg>
    </View>
  );
}
