import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors, radius } from './tokens';

/**
 * Tank gauge.
 *
 * A bar, not a dial: at a glance, in traffic, without reading a number. Ticks
 * every 5 litres so the reserve line is visible as a place, not a number he
 * has to compute.
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
  }

  return (
    <View>
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
          </Text>
        )}
      </View>
    </View>
  );
}

/**
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

  const behind = actual < breakEven;

  return (
    <View>
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
        </Text>
      </View>
    </View>
  );
}

const captionStyle = { fontSize: 12, fontWeight: '500' as const };

/** Horizontal bars for category breakdowns. No axes, no labels to decode. */
export function BarList({
  rows,
}: {
  rows: { label: string; value: number; caption?: string }[];
}) {
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
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  captionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  caption: { ...captionStyle, color: colors.textMuted },
  gaugeFallback: { paddingVertical: 8 },
  barCaptionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { ...captionStyle, color: colors.text, flex: 1, marginRight: 8 },
  barValue: { ...captionStyle, color: colors.textMuted },
  barTrack: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.accent, borderRadius: 4 },
});