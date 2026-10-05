import React, { useEffect, useState } from 'react';
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
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="mb-2 text-title font-bold text-bad">Impossible d’ouvrir la base de données</Text>
        <Text className="text-center text-body text-ink-muted">{error}</Text>
      </View>
    );
  }

  const p = scheme === 'dark' ? darkColors : lightColors;
  const verdict = verdictColors(p)[breakEven.verdict];
  const tankValue = unrecoveredFuelMoney(tank);
  const kmLeft = kmLeftInTank(tank, efficiency);
  const atReserve = isAtReserve(tank);

  return (
    <ScrollView
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
          </Pressable>
        </View>
      </View>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* 1. Ai-je gagné de l'argent ? */}
      <Card className="mb-3 gap-1">
        <Label>Bénéfice du jour</Label>
        <Text
          className={`py-1 text-[44px] font-bold tracking-tight ${today.profit >= 0 ? 'text-ink' : 'text-bad'}`}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {fbu(today.profit)}
        </Text>
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
            {verdictLabel(breakEven.verdict)}
          </Text>
        </View>

        {breakEven.verdict !== 'not_enough_data' && (
          <>
            <MarginGauge breakEven={breakEven.trueBreakEvenKmPerL} actual={breakEven.actualKmPerL} />
            <Text className="text-body leading-[22px] text-ink">{breakEvenText}</Text>
            <View className="flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
              <Text className="text-[11px] text-ink-faint">Argent gagné</Text>
              <Text className="mr-2 text-small font-bold text-ink">{fbu(perKm.revenue)}</Text>
              <Text className="text-[11px] text-ink-faint">Argent dépensé</Text>
              <Text className="mr-2 text-small font-bold text-ink">{fbu(perKm.costPerKm)}</Text>
              <Text className="text-[11px] text-ink-faint">Bénéfice par km</Text>
              <Text
                className={`text-small font-bold ${perKm.profitPerKm >= 0 ? 'text-good' : 'text-bad'}`}
              >
                {fbu(perKm.profitPerKm)}
              </Text>
            </View>
          </>
        )}
      </Card>

      {/* 3. Combien de mon argent est dans le réservoir ? */}
      <Card className="mb-3">
        <Label>Ton réservoir</Label>
        <View className="my-3">
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
          <View className="mt-2 rounded-control bg-warn-dim px-3 py-2.5">
            <Text className="text-small leading-5 text-warn">
              {fbu(tankValue)} de ton argent sont en carburant dans le réservoir.
            </Text>
          </View>
        )}
        {atReserve && tank.litres > 0 && (
          <View className="mt-2 rounded-control bg-bad-dim px-3 py-2.5">
            <Text className="text-small leading-5 text-bad">
              Niveau de réserve. Il est temps de faire le plein.
            </Text>
          </View>
        )}
      </Card>

      {warnings.length > 0 && (
        <Card className="mb-3 border-warn bg-warn-dim">
          {warnings.map((w) => (
            <Text key={w} className="text-small leading-5 text-warn">
              {w}
            </Text>
          ))}
        </Card>
      )}

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
        />
      </Card>
    </ScrollView>
  );
}

function dateDuJour(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
