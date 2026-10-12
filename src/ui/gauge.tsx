import React from 'react';
<<<<<<< HEAD
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from './ThemeProvider';

/**
 * Jauges.
 *
 * SVG ne comprend pas className : les couleurs viennent donc de useTheme().
 * C'est le seul endroit du kit UI qui a encore besoin des valeurs JS.
 */

/**
 * Jauge du réservoir.
 *
 * Une barre, pas un cadran : lisible d'un coup d'œil dans la circulation, sans
 * avoir à lire un chiffre. Un trait tous les 5 litres pour que la réserve soit
 * visible comme un endroit, pas comme un nombre à calculer.
=======
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { radius } from './tokens';
import { useTheme, useThemedStyles } from './ThemeProvider';
import type { Colors } from '../core/theme';

/**
 * Tank gauge.
 *
 * A bar, not a dial: at a glance, in traffic, without reading a number. Ticks
 * every 5 litres so the reserve line is visible as a place, not a number he
 * has to compute.
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
 */
export function TankGauge({
  litres,
  capacityL,
  reserveL = 0,
  blendedPrice = null,
}: {
  litres: number;
  capacityL: number;
  reserveL?: number;
  blendedPrice?: number | null;
}) {
  const { colors } = useTheme();
<<<<<<< HEAD
  const W = 320;
  const H = 22;
  const cap = capacityL > 0 ? capacityL : 1;
  const fill = Math.max(0, Math.min(1, litres / cap));
  const reserve = Math.max(0, Math.min(1, reserveL / cap));
  const atReserve = litres <= reserveL;

  const ticks = [];
  const every = cap > 80 ? 20 : cap > 40 ? 10 : 5;
  for (let l = every; l < cap; l += every) {
    ticks.push(<Rect key={l} x={(l / cap) * W} y={0} width={1} height={H} fill={colors.surfaceAlt} />);
=======
  const styles = useThemedStyles(makeStyles);

  const width = 320;
  const height = 28;
  const safeCapacity = capacityL > 0 ? capacityL : 1;
  const fillRatio = Math.max(0, Math.min(1, litres / safeCapacity));
  const reserveRatio = Math.max(0, Math.min(1, reserveL / safeCapacity));
  const atReserve = litres <= reserveL;

  const ticks = [];
  const tickEvery = safeCapacity > 80 ? 20 : safeCapacity > 40 ? 10 : 5;
  for (let l = tickEvery; l < safeCapacity; l += tickEvery) {
    const x = (l / safeCapacity) * width;
    ticks.push(<Rect key={l} x={x} y={0} width={1} height={height} fill={colors.surfaceAlt} />);
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  }

  return (
    <View>
<<<<<<< HEAD
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Rect x={0} y={0} width={W} height={H} rx={8} fill={colors.surfaceAlt} />
        {ticks}
        {reserve > 0 && <Rect x={0} y={0} width={Math.max(1, reserve * W)} height={H} fill={colors.badDim} />}
        <Rect
          x={0}
          y={0}
          width={Math.max(0, fill * W)}
          height={H}
          rx={8}
          fill={atReserve ? colors.bad : colors.good}
        />
      </Svg>
      <View className="mt-1.5 flex-row justify-between">
        <Text className="text-[11px] text-ink-muted">
          {litres.toFixed(1).replace('.', ',')} / {capacityL.toFixed(0)} L
        </Text>
        {blendedPrice !== null && (
          <Text className="text-[11px] text-ink-muted">
            à {Math.round(blendedPrice).toLocaleString('fr-FR').replace(/ |,/g, ' ')} FBu/L
=======
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} rx={radius.sm} fill={colors.surfaceAlt} />
        {ticks}
        {reserveRatio > 0 && (
          <Rect
            x={0}
            y={0}
            width={Math.max(1, reserveRatio * width)}
            height={height}
            fill={colors.badDim}
          />
        )}
        <Rect
          x={0}
          y={0}
          width={Math.max(0, fillRatio * width)}
          height={height}
          rx={radius.sm}
          fill={atReserve ? colors.bad : colors.good}
        />
      </Svg>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>{litres.toFixed(1)} / {capacityL.toFixed(0)} L</Text>
        {blendedPrice !== null && (
          <Text style={styles.caption}>
            running on {Math.round(blendedPrice).toLocaleString('en-US')} FBu/L
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
          </Text>
        )}
      </View>
    </View>
  );
}

/**
<<<<<<< HEAD
 * Deux nombres sur une seule échelle : ce qu'il lui faut, ce qu'il fait.
 * L'intérêt est qu'ils sont comparables d'un coup d'œil.
 */
export function MarginGauge({ breakEven, actual }: { breakEven: number | null; actual: number | null }) {
  const { colors } = useTheme();
  const W = 320;
  const H = 18;

  if (breakEven === null || actual === null || breakEven <= 0) {
    return <Text className="py-2 text-[11px] text-ink-muted">Pas encore assez de route pour comparer.</Text>;
  }

  const max = Math.max(breakEven, actual) * 1.25;
  const at = (v: number) => (v / max) * W;
=======
 * Two numbers on one scale: what he needs, what he gets.
 * The whole point is that they are visually comparable at a glance.
 */
export function MarginGauge({
  breakEven,
  actual,
}: {
  breakEven: number | null;
  actual: number | null;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const width = 320;
  const height = 20;
  if (breakEven === null || actual === null || breakEven <= 0) {
    return (
      <View style={styles.gaugeFallback}>
        <Text style={styles.caption}>Not enough driving yet to compare.</Text>
      </View>
    );
  }

  // Scale so both markers always fit, with a little headroom.
  const max = Math.max(breakEven, actual) * 1.25;
  const at = (v: number) => (v / max) * width;

>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  const behind = actual < breakEven;

  return (
    <View>
<<<<<<< HEAD
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Rect x={0} y={H / 2 - 2} width={W} height={4} rx={2} fill={colors.surfaceAlt} />
        <Rect x={at(breakEven) - 2} y={0} width={4} height={H} rx={2} fill={colors.warn} />
        <Rect x={at(actual) - 3} y={2} width={6} height={H - 4} rx={3} fill={behind ? colors.bad : colors.good} />
      </Svg>
      <View className="mt-1 flex-row justify-between">
        <Text className="text-[11px] text-warn">besoin {breakEven.toFixed(1).replace('.', ',')} km/L</Text>
        <Text className={`text-[11px] ${behind ? 'text-bad' : 'text-good'}`}>
          toi {actual.toFixed(1).replace('.', ',')} km/L
=======
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={height / 2 - 2} width={width} height={4} rx={2} fill={colors.surfaceAlt} />
        {/* what he needs */}
        <Rect x={at(breakEven) - 2} y={0} width={4} height={height} rx={2} fill={colors.warn} />
        {/* what he gets */}
        <Rect x={at(actual) - 3} y={2} width={6} height={height - 4} rx={3} fill={behind ? colors.bad : colors.good} />
      </Svg>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>need {breakEven.toFixed(1)} km/L</Text>
        <Text style={[styles.caption, { color: behind ? colors.bad : colors.good }]}>
          you {actual.toFixed(1)} km/L
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        </Text>
      </View>
    </View>
  );
}

<<<<<<< HEAD
/** Barres horizontales pour les ventilations. Ni axes, ni légendes à déchiffrer. */
export function BarList({ rows }: { rows: { label: string; value: number; caption?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <View className="gap-2.5">
      {rows.map((r) => (
        <View key={r.label}>
          <View className="mb-1 flex-row justify-between">
            <Text className="mr-2 flex-1 text-[11px] text-ink" numberOfLines={1}>
              {r.label}
            </Text>
            <Text className="text-[11px] text-ink-muted">
              {Math.round(r.value).toLocaleString('fr-FR').replace(/ |,/g, ' ')}
              {r.caption ? `  ${r.caption}` : ''}
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-surface-alt">
            <View
              className={`h-2 rounded-full ${r.value < 0 ? 'bg-bad' : 'bg-accent'}`}
              style={{ width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%` }}
=======
const captionStyle = { fontSize: 12, fontWeight: '500' as const };

/** Horizontal bars for category breakdowns. No axes, no labels to decode. */
export function BarList({
  rows,
}: {
  rows: { label: string; value: number; caption?: string }[];
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <View style={styles.barCaptionRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.barValue}>
              {Math.round(r.value).toLocaleString('en-US')}{r.caption ? `  ${r.caption}` : ''}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%` },
                r.value < 0 && { backgroundColor: colors.bad },
              ]}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
            />
          </View>
        </View>
      ))}
    </View>
  );
}

<<<<<<< HEAD
export const gaugeStyles = StyleSheet.create({});
=======
const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  captionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  caption: { ...captionStyle, color: colors.textMuted },
  gaugeFallback: { paddingVertical: 8 },
  barCaptionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { ...captionStyle, color: colors.text, flex: 1, marginRight: 8 },
  barValue: { ...captionStyle, color: colors.textMuted },
  barTrack: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.accent, borderRadius: 4 },
  });
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
