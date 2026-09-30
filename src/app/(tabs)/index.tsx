import React, { useEffect, useState } from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { ActionButton, Card, Divider, Label, Row, Stat } from '../../ui/components';
import { MarginGauge, TankGauge } from '../../ui/gauge';
import { font, radius, space, FONT_FAMILY, TAB_BAR_CLEARANCE } from '../../ui/tokens';
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
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Impossible d’ouvrir la base de données</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  const verdictStyle = verdict[breakEven.verdict];
  const tankValue = unrecoveredFuelMoney(tank);
  const kmLeft = kmLeftInTank(tank, efficiency);
  const atReserve = isAtReserve(tank);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      <View style={styles.header}>
        <Text style={styles.date}>{todayLabel()}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.tankChip}>Réservoir {litres(tank.litres)}</Text>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Réglages"
            style={styles.gear}
          >
            <Text style={styles.gearGlyph}>⚙</Text>
          </Pressable>
        </View>
      </View>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* 1. Ai-je gagné de l'argent aujourd'hui ? */}
      <Card style={styles.heroCard}>
        <Label>BÉNÉFICE DU JOUR</Label>
        <Text
          style={[styles.hero, { color: today.profit >= 0 ? colors.text : colors.bad }]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {fbu(today.profit)}
        </Text>
        <Text style={styles.heroBreakdown} numberOfLines={2}>
          Recettes {fbu(today.fares)} − Carburant {fbu(today.fuelCost)} − Autres {fbu(today.otherCosts)}
        </Text>
        <Divider />
        <Row
          label="Dans ta poche aujourd'hui"
          value={fbu(today.cashInHand)}
          color={today.cashInHand >= 0 ? colors.text : colors.bad}
        />
        <Text style={styles.note}>
          {today.fuelBoughtToday > 0
            ? 'Le carburant acheté aujourd’hui sort de ta poche maintenant, pas le jour où tu le consomes.'
            : 'L’argent en poche n’est pas le bénéfice : le carburant brûlé a été payé un autre jour.'}
        </Text>
      </Card>

      {/* 2. Am I running without making money? */}
      <Card style={[styles.verdictCard, { borderColor: verdictStyle.fg }]}>
        <View style={[styles.verdictChip, { backgroundColor: verdictStyle.bg }]}>
          <View style={[styles.dot, { backgroundColor: verdictStyle.fg }]} />
          <Text style={[styles.verdictLabel, { color: verdictStyle.fg }]}>
            {verdictLabel(breakEven.verdict)}
          </Text>
        </View>

        {breakEven.verdict !== 'not_enough_data' && (
          <>
            <MarginGauge breakEven={breakEven.trueBreakEvenKmPerL} actual={breakEven.actualKmPerL} />
            <Text style={styles.reason}>{breakEvenText}</Text>
            <View style={styles.marginRow}>
              <Text style={styles.marginCaption}>Argent gagné</Text>
              <Text style={styles.marginValue}>{fbu(perKm.revenue)}</Text>
              <Text style={styles.marginCaption}>Argent dépensé</Text>
              <Text style={styles.marginValue}>{fbu(perKm.costPerKm)}</Text>
              <Text style={styles.marginCaption}>Bénéfice par km</Text>
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

      {/* 3. Combien de mon argent est dans le réservoir ? */}
      <Card>
        <Label>TON RÉSERVOIR</Label>
        <View style={styles.gaugeWrap}>
          <TankGauge
            litres={tank.litres}
            capacityL={tank.capacityL}
            reserveL={tank.reserveL}
            blendedPrice={blendedPrice(tank)}
          />
        </View>
        <Row
          label={kmLeft === null ? 'Autonomie' : `Autonomie à ${kmPerLitre(efficiency)}`}
          value={kmLeft === null ? '—' : `${Math.round(kmLeft)} km`}
        />
        <Row label="Argent du carburant dans le réservoir" value={fbu(tankValue)} />
        {tankValue > 0 && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              {fbu(tankValue)} de ton argent sont en carburant dans le réservoir.
            </Text>
          </View>
        )}
        {atReserve && tank.litres > 0 && (
          <View style={[styles.warnBox, { backgroundColor: colors.badDim }]}>
            <Text style={[styles.warnText, { color: colors.bad }]}>
              Niveau de réserve. Il est temps de faire le plein.
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

      {/* Les trois gestes qu'il fait toute la journée. */}
      <View style={styles.actions}>
        <ActionButton label="TRAJET" icon="＋" onPress={() => router.push('/trip/new')} tone="primary" />
        <ActionButton label="PLEIN" icon="⛽" onPress={() => router.push('/fuel/new')} />
        <ActionButton label="DÉPENSE" icon="−" onPress={() => router.push('/cost/new')} />
      </View>

      <Card>
        <View style={styles.statRow}>
          <Stat label="kilomètres" value={`${Math.round(today.km)}`} />
          <Stat label="trajets" value={`${today.tripCount}`} />
          <Stat label="carburant brûlé" value={litres(today.fuelCost / Math.max(1, blendedPrice(tank) ?? 3800))} />
          <Stat label="gagné par km" value={fbu(perKm.revenuePerKm)} />
        </View>
        <Divider />
        <Row label="Ton rendement" value={kmPerLitre(efficiency)} />
        <Row
          label="Marge de bénéfice"
          value={pct(perKm.profitMarginPct)}
          color={perKm.profitMarginPct >= 15 ? colors.good : perKm.profitMarginPct >= 0 ? colors.warn : colors.bad}
        />
      </Card>
    </ScrollView>
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

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
  verdictLabel: { ...font.small, fontFamily: FONT_FAMILY.bold, letterSpacing: 0.5 },
  reason: { ...font.body, color: colors.text, lineHeight: 22 },
  marginRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'baseline' },
  marginCaption: { ...font.tiny, color: colors.textFaint },
  marginValue: { ...font.small, color: colors.text, fontFamily: FONT_FAMILY.bold, marginRight: space.md },
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