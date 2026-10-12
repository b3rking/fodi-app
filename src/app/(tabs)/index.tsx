import React, { useEffect, useState } from 'react';
<<<<<<< HEAD
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { ActionButton, Card, Divider, Label, Row, Stat, TAB_ICONS } from '../../ui/components';
import { MarginGauge, TankGauge } from '../../ui/gauge';
import { SettingsSheet } from '../../ui/settings-sheet';
import { useTheme } from '../../ui/ThemeProvider';
import { darkColors, lightColors, verdictColors } from '../../core/theme';
import { verdictLabel } from '../../core/fuel/breakeven';
import { fbu, kmPerLitre, litres, pct } from '../../core/format';
import { kmLeftInTank, unrecoveredFuelMoney, blendedPrice, isAtReserve } from '../../core/fuel/engine';

/**
 * Aujourd'hui : trois questions, trois secondes.
 *
 *   1. Ai-je gagné de l'argent aujourd'hui ?
 *   2. Est-ce que je perds de l'argent sur le carburant ?
 *   3. Combien de mon argent est dans le réservoir ?
 *
 * Tout ce qui est sous les trois gros boutons est secondaire. Si cet écran
 * devait avoir une septième chose à lire, il aurait cessé de faire son travail.
 */
export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();
=======
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { ActionButton, Card, Divider, Label, Row, Stat } from '../../ui/components';
import { MarginGauge, TankGauge } from '../../ui/gauge';
import { font, radius, space } from '../../ui/tokens';
import { verdictLabel } from '../../core/fuel/breakeven';
import { SettingsSheet } from '../../ui/settings-sheet';
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
  const { colors, verdict } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const router = useRouter();
  const insets = useSafeAreaInsets();
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  const { ready, today, perKm, tank, efficiency, breakEven, breakEvenText, warnings, error } =
    useAppStore();
  const recompute = useAppStore((s) => s.recompute);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
<<<<<<< HEAD
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="mb-2 text-title font-bold text-bad">Impossible d’ouvrir la base de données</Text>
        <Text className="text-center text-body text-ink-muted">{error}</Text>
=======
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Cannot open the database</Text>
        <Text style={styles.errorBody}>{error}</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
      </View>
    );
  }

<<<<<<< HEAD
  const p = scheme === 'dark' ? darkColors : lightColors;
  const verdict = verdictColors(p)[breakEven.verdict];
=======
  const verdictStyle = verdict[breakEven.verdict];
void verdictStyle;
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  const tankValue = unrecoveredFuelMoney(tank);
  const kmLeft = kmLeftInTank(tank, efficiency);
  const atReserve = isAtReserve(tank);

  return (
    <ScrollView
<<<<<<< HEAD
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.textMuted} />}
    >
      {/* En-tête */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-title font-bold text-ink">{dateDuJour()}</Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-chip border border-line bg-surface-alt px-3 py-1">
            <Text className="text-small text-ink-muted">Réservoir {litres(tank.litres)}</Text>
          </View>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Réglages"
            className="h-9 w-9 items-center justify-center rounded-full border border-line bg-surface-alt active:opacity-70"
          >
            <SettingsIcon size={17} color={p.textMuted} />
=======
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: space.xxl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      <View style={styles.header}>
        <Text style={styles.date}>{todayLabel()}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.tankChip}>Tank {litres(tank.litres)}</Text>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gear}
          >
            <Text style={styles.gearGlyph}>⚙</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
          </Pressable>
        </View>
      </View>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

<<<<<<< HEAD
      {/* 1. Ai-je gagné de l'argent ? */}
      <Card className="mb-3 gap-1">
        <Label>Bénéfice du jour</Label>
        <Text
          className={`py-1 text-[44px] font-bold tracking-tight ${today.profit >= 0 ? 'text-ink' : 'text-bad'}`}
=======
      {/* 1. Did I make money? */}
      <Card style={styles.heroCard}>
        <Label>TODAY'S PROFIT</Label>
        <Text
          style={[styles.hero, { color: today.profit >= 0 ? colors.text : colors.bad }]}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {fbu(today.profit)}
        </Text>
<<<<<<< HEAD
        <Text className="text-small text-ink-muted" numberOfLines={2}>
          Recettes {fbu(today.fares)} − Carburant {fbu(today.fuelCost)} − Autres {fbu(today.otherCosts)}
        </Text>
        <Divider />
        <Row
          label="Dans ta poche aujourd’hui"
          value={fbu(today.cashInHand)}
          tone={today.cashInHand >= 0 ? 'default' : 'bad'}
        />
        <Text className="mt-1 text-[11px] leading-4 text-ink-faint">
          {today.fuelBoughtToday > 0
            ? 'Le carburant acheté aujourd’hui sort de ta poche maintenant, pas le jour où tu le consomes.'
            : 'L’argent en poche n’est pas le bénéfice : le carburant brûlé a été payé un autre jour.'}
        </Text>
      </Card>

      {/* 2. Est-ce que je perds de l'argent ? */}
      <Card className="mb-3 gap-3">
        <View
          className="self-start rounded-chip px-3 py-1"
          style={{ backgroundColor: verdict.bg }}
        >
          <Text className="text-small font-bold tracking-wide" style={{ color: verdict.fg }}>
=======
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
      <Card style={[styles.verdictCard, { borderColor: verdictStyle.fg }]}>
        <View style={[styles.verdictChip, { backgroundColor: verdictStyle.bg }]}>
          <View style={[styles.dot, { backgroundColor: verdictStyle.fg }]} />
          <Text style={[styles.verdictLabel, { color: verdictStyle.fg }]}>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
            {verdictLabel(breakEven.verdict)}
          </Text>
        </View>

        {breakEven.verdict !== 'not_enough_data' && (
          <>
            <MarginGauge breakEven={breakEven.trueBreakEvenKmPerL} actual={breakEven.actualKmPerL} />
<<<<<<< HEAD
            <Text className="text-body leading-[22px] text-ink">{breakEvenText}</Text>
            <View className="flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
              <Text className="text-[11px] text-ink-faint">Argent gagné</Text>
              <Text className="mr-2 text-small font-bold text-ink">{fbu(perKm.revenue)}</Text>
              <Text className="text-[11px] text-ink-faint">Argent dépensé</Text>
              <Text className="mr-2 text-small font-bold text-ink">{fbu(perKm.costPerKm)}</Text>
              <Text className="text-[11px] text-ink-faint">Bénéfice par km</Text>
              <Text
                className={`text-small font-bold ${perKm.profitPerKm >= 0 ? 'text-good' : 'text-bad'}`}
=======
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
              >
                {fbu(perKm.profitPerKm)}
              </Text>
            </View>
          </>
        )}
      </Card>

<<<<<<< HEAD
      {/* 3. Combien de mon argent est dans le réservoir ? */}
      <Card className="mb-3">
        <Label>Ton réservoir</Label>
        <View className="my-3">
=======
      {/* 3. How much of my money is in the tank? */}
      <Card>
        <Label>YOUR TANK</Label>
        <View style={styles.gaugeWrap}>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
          <TankGauge
            litres={tank.litres}
            capacityL={tank.capacityL}
            reserveL={tank.reserveL}
            blendedPrice={blendedPrice(tank)}
          />
        </View>
        <Row
<<<<<<< HEAD
          label={kmLeft === null ? 'Autonomie' : `Autonomie à ${kmPerLitre(efficiency)}`}
          value={kmLeft === null ? '—' : `${Math.round(kmLeft)} km`}
        />
        <Row label="Argent du carburant dans le réservoir" value={fbu(tankValue)} />
        {tankValue > 0 && (
          <View className="mt-2 rounded-control bg-warn-dim px-3 py-2.5">
            <Text className="text-small leading-5 text-warn">
              {fbu(tankValue)} de ton argent sont en carburant dans le réservoir.
=======
          label={kmLeft === null ? 'Range' : `Range at ${kmPerLitre(efficiency)}`}
          value={kmLeft === null ? '—' : `${Math.round(kmLeft)} km`}
        />
        <Row label="Fuel money in the tank" value={fbu(tankValue)} />
        {tankValue > 0 && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              {fbu(tankValue)} of your money is fuel in the tank right now.
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
            </Text>
          </View>
        )}
        {atReserve && tank.litres > 0 && (
<<<<<<< HEAD
          <View className="mt-2 rounded-control bg-bad-dim px-3 py-2.5">
            <Text className="text-small leading-5 text-bad">
              Niveau de réserve. Il est temps de faire le plein.
=======
          <View style={[styles.warnBox, { backgroundColor: colors.badDim }]}>
            <Text style={[styles.warnText, { color: colors.bad }]}>
              Reserve level. Time to fill up.
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
            </Text>
          </View>
        )}
      </Card>

      {warnings.length > 0 && (
<<<<<<< HEAD
        <Card className="mb-3 border-warn bg-warn-dim">
          {warnings.map((w) => (
            <Text key={w} className="text-small leading-5 text-warn">
=======
        <Card style={styles.warnCard}>
          {warnings.map((w) => (
            <Text key={w} style={styles.warnText}>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
              {w}
            </Text>
          ))}
        </Card>
      )}

<<<<<<< HEAD
      {/* Les trois gestes de la journée */}
      <View className="mb-3 flex-row gap-2">
        <ActionButton label="TRAJET" icon={TAB_ICONS.trips} onPress={() => router.push('/trip/new')} tone="primary" />
        <ActionButton label="PLEIN" icon={TAB_ICONS.fuel} onPress={() => router.push('/fuel/new')} />
        <ActionButton label="DÉPENSE" icon={TAB_ICONS.money} onPress={() => router.push('/cost/new')} />
      </View>

      <Card>
        <View className="flex-row">
          <Stat label="kilomètres" value={`${Math.round(today.km)}`} />
          <Stat label="trajets" value={`${today.tripCount}`} />
          <Stat
            label="carburant brûlé"
            value={litres(today.fuelCost / Math.max(1, blendedPrice(tank) ?? 3800))}
          />
          <Stat label="gagné par km" value={fbu(perKm.revenuePerKm)} />
        </View>
        <Divider />
        <Row label="Ton rendement" value={kmPerLitre(efficiency)} />
        <Row
          label="Marge de bénéfice"
          value={pct(perKm.profitMarginPct)}
          tone={perKm.profitMarginPct >= 15 ? 'good' : perKm.profitMarginPct >= 0 ? 'default' : 'bad'}
=======
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        />
      </Card>
    </ScrollView>
  );
}

<<<<<<< HEAD
function dateDuJour(): string {
  return new Date().toLocaleDateString('fr-FR', {
=======
function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
<<<<<<< HEAD
=======

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, gap: space.md },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  errorTitle: { ...font.title, color: colors.bad, marginBottom: space.sm },
  errorBody: { ...font.body, color: colors.textMuted, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  gear: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gearGlyph: { fontSize: 17, color: colors.textMuted },
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
