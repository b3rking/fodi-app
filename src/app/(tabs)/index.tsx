import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { ActionButton, Card, Divider, Label, Row, Stat } from '../../ui/components';
import { MarginGauge, TankGauge } from '../../ui/gauge';
import { colors, font, radius, space, verdictColors } from '../../ui/tokens';
import { verdictLabel } from '../../core/fuel/breakeven';
import { fbu, kmPerLitre, litres, pct } from '../../core/format';
import { kmLeftInTank, unrecoveredFuelMoney, blendedPrice, isAtReserve } from '../../core/fuel/engine';
import { relativeDays } from '../../core/format';

/**
 * Today: three questions, three seconds.
 *
 *   1. Did I make money?
 *   2. Am I running without making money?
 *   3. How much of my money is in the tank?
 *
 * Everything below the three big buttons is secondary. If this screen ever
 * grows a seventh thing to read, it has stopped doing its job.
 */
export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ready, today, perKm, tank, efficiency, breakEven, breakEvenText, warnings, error } =
    useAppStore();
  const recompute = useAppStore((s) => s.recompute);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!ready) void recompute();
  }, [ready, recompute]);

  const onRefresh = async () => {
    setRefreshing(true);
    await recompute();
    setRefreshing(false);
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Cannot open the database</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  const verdict = verdictColors[breakEven.verdict];
  const tankValue = unrecoveredFuelMoney(tank);
  const kmLeft = kmLeftInTank(tank, efficiency);
  const atReserve = isAtReserve(tank);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: space.xxl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      <View style={styles.header}>
        <Text style={styles.date}>{todayLabel()}</Text>
        <Text style={styles.tankChip}>
          Tank {litres(tank.litres)}
        </Text>
      </View>

      {/* 1. Did I make money? */}
      <Card style={styles.heroCard}>
        <Label>TODAY'S PROFIT</Label>
        <Text
          style={[styles.hero, { color: today.profit >= 0 ? colors.text : colors.bad }]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {fbu(today.profit)}
        </Text>
        <Text style={styles.heroBreakdown} numberOfLines={2}>
          Fares {fbu(today.fares)} − Fuel {fbu(today.fuelCost)} − Other {fbu(today.otherCosts)}
        </Text>
        <Divider />
        <Row
          label="In your pocket today"
          value={fbu(today.cashInHand)}
          color={today.cashInHand >= 0 ? colors.text : colors.bad}
        />
        <Text style={styles.note}>
          {today.fuelBoughtToday > 0
            ? 'Fuel you bought today comes out of your pocket now, not on the day you burn it.'
            : 'Cash is not the same as profit: fuel you burned was paid for on an earlier day.'}
        </Text>
      </Card>

      {/* 2. Am I running without making money? */}
      <Card style={[styles.verdictCard, { borderColor: verdict.fg }]}>
        <View style={[styles.verdictChip, { backgroundColor: verdict.bg }]}>
          <View style={[styles.dot, { backgroundColor: verdict.fg }]} />
          <Text style={[styles.verdictLabel, { color: verdict.fg }]}>
            {verdictLabel(breakEven.verdict)}
          </Text>
        </View>

        {breakEven.verdict !== 'not_enough_data' && (
          <>
            <MarginGauge breakEven={breakEven.trueBreakEvenKmPerL} actual={breakEven.actualKmPerL} />
            <Text style={styles.reason}>{breakEvenText}</Text>
            <View style={styles.marginRow}>
              <Text style={styles.marginCaption}>Money in</Text>
              <Text style={styles.marginValue}>{fbu(perKm.revenue)}</Text>
              <Text style={styles.marginCaption}>Money out</Text>
              <Text style={styles.marginValue}>{fbu(perKm.costPerKm)}</Text>
              <Text style={styles.marginCaption}>Profit each km</Text>
              <Text
                style={[
                  styles.marginValue,
                  { color: perKm.profitPerKm >= 0 ? colors.good : colors.bad },
                ]}
              >
                {fbu(perKm.profitPerKm)}
              </Text>
            </View>
          </>
        )}
      </Card>

      {/* 3. How much of my money is in the tank? */}
      <Card>
        <Label>YOUR TANK</Label>
        <View style={styles.gaugeWrap}>
          <TankGauge
            litres={tank.litres}
            capacityL={tank.capacityL}
            reserveL={tank.reserveL}
            blendedPrice={blendedPrice(tank)}
          />
        </View>
        <Row
          label={kmLeft === null ? 'Range' : `Range at ${kmPerLitre(efficiency)}`}
          value={kmLeft === null ? '—' : `${Math.round(kmLeft)} km`}
        />
        <Row label="Fuel money in the tank" value={fbu(tankValue)} />
        {tankValue > 0 && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              {fbu(tankValue)} of your money is fuel in the tank right now.
            </Text>
          </View>
        )}
        {atReserve && tank.litres > 0 && (
          <View style={[styles.warnBox, { backgroundColor: colors.badDim }]}>
            <Text style={[styles.warnText, { color: colors.bad }]}>
              Reserve level. Time to fill up.
            </Text>
          </View>
        )}
      </Card>

      {warnings.length > 0 && (
        <Card style={styles.warnCard}>
          {warnings.map((w) => (
            <Text key={w} style={styles.warnText}>
              {w}
            </Text>
          ))}
        </Card>
      )}

      {/* The three things he actually does all day. */}
      <View style={styles.actions}>
        <ActionButton label="TRIP" icon="＋" onPress={() => router.push('/trip/new')} tone="primary" />
        <ActionButton label="FUELLED UP" icon="⛽" onPress={() => router.push('/fuel/new')} />
        <ActionButton label="COST" icon="−" onPress={() => router.push('/cost/new')} />
      </View>

      <Card>
        <View style={styles.statRow}>
          <Stat label="kilometres" value={`${Math.round(today.km)}`} />
          <Stat label="trips" value={`${today.tripCount}`} />
          <Stat label="fuel burned" value={litres(today.fuelCost / Math.max(1, blendedPrice(tank) ?? 3800))} />
          <Stat label="earned per km" value={fbu(perKm.revenuePerKm)} />
        </View>
        <Divider />
        <Row label="Your fuel economy" value={kmPerLitre(efficiency)} />
        <Row
          label="Profit margin"
          value={pct(perKm.profitMarginPct)}
          color={perKm.profitMarginPct >= 15 ? colors.good : perKm.profitMarginPct >= 0 ? colors.warn : colors.bad}
        />
      </Card>
    </ScrollView>
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, gap: space.md },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  errorTitle: { ...font.title, color: colors.bad, marginBottom: space.sm },
  errorBody: { ...font.body, color: colors.textMuted, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { ...font.title, color: colors.text },
  tankChip: {
    ...font.small,
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroCard: { gap: space.xs },
  hero: { ...font.hero, marginVertical: space.xs },
  heroBreakdown: { ...font.small, color: colors.textMuted },
  note: { ...font.tiny, color: colors.textFaint, marginTop: space.xs },
  verdictCard: { gap: space.md },
  verdictChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    gap: space.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  verdictLabel: { ...font.small, fontWeight: '800', letterSpacing: 0.5 },
  reason: { ...font.body, color: colors.text, lineHeight: 22 },
  marginRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'baseline' },
  marginCaption: { ...font.tiny, color: colors.textFaint },
  marginValue: { ...font.small, color: colors.text, fontWeight: '700', marginRight: space.md },
  gaugeWrap: { marginVertical: space.md },
  warnBox: {
    backgroundColor: colors.warnDim,
    borderRadius: radius.sm,
    padding: space.md,
    marginTop: space.sm,
  },
  warnCard: { backgroundColor: colors.warnDim, borderColor: colors.warn },
  warnText: { ...font.small, color: colors.warn, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: space.sm },
  statRow: { flexDirection: 'row' },
});