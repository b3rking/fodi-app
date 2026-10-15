import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { replayFills, replayLiveTank, totalLitres, tankCost, blendedPrice } from '../core/fuel/engine';
import { buildCycles, perKmStats, verdictFor } from '../core/fuel/breakeven';
import { expandRecurrings } from '../core/money/period';
import { listExpenses, listIncomes } from '../db/database';
import {
  formatDayFr,
  formatFBu,
  formatKm,
  formatKmPerLitre,
  formatLitres,
  formatPricePerLitre,
} from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { darkPalette, lightPalette } from '../core/theme';
import { useColorScheme } from 'nativewind';
import { fr } from '../i18n/fr';
import { FuelFormSheet } from './FuelFormSheet';
import { PrimaryButton } from '../components/buttons';
import { BarsGauge, NeedleGauge } from '../components/FuelGauges';
import { useToastStore } from '../store/toastStore';
import { useTripsStore } from '../store/tripsStore';
import { useMoneyStore } from '../store/moneyStore';
import { useThemeStore } from '../store/themeStore';

const RESERVE_L = 7;

export function FuelScreen() {
  const fills = useFuelStore((s) => s.fills);
  const capL = useFuelStore((s) => s.capL);
  const levels = useFuelStore((s) => s.levels);
  const gauge = useFuelStore((s) => s.gauge);
  const levelFormat = useFuelStore((s) => s.levelFormat);
  const trips = useTripsStore((s) => s.trips);
  const moneyRules = useMoneyStore((s) => s.recurrings);
  const removeFill = useFuelStore((s) => s.removeFill);
  const restoreFill = useFuelStore((s) => s.restoreFill);
  const showToast = useToastStore((s) => s.show);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? darkPalette : lightPalette;
  const accent = useThemeStore((s) => s.accent);

  const confirmDelete = (id: number, detail: string) => {
    Alert.alert(fr.fuel.deleteTitle, detail, [
      { text: fr.fuel.cancel, style: 'cancel' },
      {
        text: fr.fuel.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          void removeFill(id).then((snapshot) => {
            if (!snapshot) return;
            showToast(fr.toast.fillDeleted, {
              label: fr.toast.undo,
              onPress: () => void restoreFill(snapshot),
            });
          });
        },
      },
    ]);
  };

  const replay = useMemo(
    () =>
      replayFills(
        capL,
        fills.map((f) => ({
          volumeL: f.volumeL,
          pricePerLitre: f.pricePerLitre,
          feeFBu: f.feeFBu,
          litresBeforeL: f.litresBeforeL,
          litresAfterL: f.litresAfterL,
          odometerKm: f.odoKm,
          ts: f.ts,
        })),
      ),
    [capL, fills],
  );

  const overallKmL = replay.overallKmPerLitre;

  // Utilisation depuis le dernier ajout : trajets postérieurs au dernier plein.
  const lastFillTs = fills.length > 0 ? fills[fills.length - 1].ts : 0;
  const tripsSinceFill = useMemo(
    () => trips.filter((t) => t.ts > lastFillTs),
    [trips, lastFillTs],
  );
  const kmSinceFill = useMemo(
    () => tripsSinceFill.reduce((sum, t) => sum + t.km, 0),
    [tripsSinceFill],
  );

  // Réservoir « vivant » : photos rejouées puis brûlé estimé déduit en FIFO.
  // Les photos aux ajouts restent la vérité de référence.
  const live = useMemo(
    () =>
      replayLiveTank(
        capL,
        fills.map((f) => ({
          volumeL: f.volumeL,
          pricePerLitre: f.pricePerLitre,
          feeFBu: f.feeFBu,
          litresBeforeL: f.litresBeforeL,
          litresAfterL: f.litresAfterL,
          odometerKm: f.odoKm,
          ts: f.ts,
        })),
        tripsSinceFill.map((t) => ({ ts: t.ts, km: t.km, fuelL: t.fuelL })),
      ),
    [capL, fills, tripsSinceFill],
  );
  const estTripBurn = live.estimatedBurnL;
  const displayLitres = totalLitres(live.tank);
  const price = blendedPrice(live.tank);
  const value = tankCost(live.tank);
  const fraction = capL > 0 ? Math.min(1, Math.max(0, displayLitres / capL)) : 0;
  const gaugePct = fraction * 100;
  const recentKmL = [...replay.intervals].reverse().find((i) => i.kmPerLitre != null)?.kmPerLitre ?? null;
  const autonomyKm = overallKmL != null ? displayLitres * overallKmL : null;
  const showReserve = fills.length > 0 && displayLitres < RESERVE_L;
  // Estimation affichée (marquée ≈) : ce que la jauge a déduit.
  const fuelSinceFill = estTripBurn > 1e-9 ? estTripBurn : null;

  // Fenêtre 30 jours : autres coûts + revenus extra (base directe).
  const [month30, setMonth30] = useState({ other: 0, extra: 0 });
  useEffect(() => {
    const now = Date.now();
    const from = now - 30 * 24 * 3600 * 1000;
    let cancelled = false;
    void Promise.all([listExpenses(from, now), listIncomes(from, now)]).then(([exps, incs]) => {
      if (cancelled) return;
      const occ = expandRecurrings(
        moneyRules
          .filter((r) => r.active)
          .map((r) => ({
            id: r.id,
            label: r.label,
            amount: r.amount,
            cadence: r.cadence,
            nextDueMs: r.nextDue,
            active: true,
          })),
        from,
        now,
      );
      setMonth30({
        other: exps.reduce((s, e) => s + e.amount, 0) + occ.reduce((s, o) => s + o.amount, 0),
        extra: incs.reduce((s, i) => s + i.amount, 0),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [moneyRules]);

  const window30 = useMemo(() => {
    const now = Date.now();
    const from = now - 30 * 24 * 3600 * 1000;
    const trips30 = trips.filter((t) => t.ts >= from);
    const burns30 = replay.intervals.filter(
      (i) => i.endTs != null && i.endTs >= from && i.consumedL > 1e-9,
    );
    const burnL = burns30.reduce((s, i) => s + i.consumedL, 0);
    const burnCost = burns30.reduce((s, i) => s + i.costFBu, 0);
    const burnKm = burns30.reduce((s, i) => s + (i.km ?? 0), 0);
    return {
      trips30,
      revenue: trips30.reduce((s, t) => s + t.fare + t.extras, 0) + month30.extra,
      revenueKm: trips30.reduce((s, t) => s + t.km, 0),
      burnCost,
      actualKmL: burnL > 1e-9 && burnKm > 0 ? burnKm / burnL : null,
      tripCount: trips30.length,
    };
  }, [trips, replay, month30]);

  const stats = useMemo(
    () =>
      perKmStats({
        revenueFBu: window30.revenue,
        revenueKm: window30.revenueKm,
        fuelBurnCostFBu: window30.burnCost,
        otherCostsFBu: month30.other,
        actualKmLitre: window30.actualKmL,
        blendedPricePerLitre: price,
        tripCount: window30.tripCount,
      }),
    [window30, month30, price],
  );
  const verdict = verdictFor(stats.profitMarginPct, window30.tripCount);

  const lastCycle = useMemo(() => {
    const cycles = buildCycles(
      fills.map((f) => ({
        ts: f.ts,
        volumeL: f.volumeL,
        pricePerLitre: f.pricePerLitre,
        litresBeforeL: f.litresBeforeL,
        litresAfterL: f.litresAfterL,
        odometerKm: f.odoKm,
      })),
      capL,
      trips.map((t) => ({ ts: t.ts, km: t.km, fare: t.fare, extras: t.extras })),
      replay.intervals.map((i) => ({
        startTs: i.startTs,
        endTs: i.endTs,
        consumedL: i.consumedL,
        costFBu: i.costFBu,
      })),
    );
    return cycles.length > 0 ? cycles[cycles.length - 1] : null;
  }, [fills, capL, trips, replay]);

  const historyKmL = useMemo(
    () =>
      replay.intervals
        .filter((i) => i.kmPerLitre != null)
        .slice(-10)
        .map((i) => i.kmPerLitre as number),
    [replay],
  );
  const historyMax = historyKmL.length > 0 ? Math.max(...historyKmL) : 1;

  return (
    <View className="flex-1">
      <FlatList
        data={fills}
        keyExtractor={(f) => String(f.id)}
        contentContainerStyle={{ padding: 24, gap: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text className="font-700 text-3xl text-black dark:text-white">
              {fr.fuel.title}
            </Text>

            <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <Text className="font-500 text-base text-black dark:text-white">
                {fr.fuel.yourTank}
              </Text>
              {gauge === 'bars' ? (
                <BarsGauge levels={levels} fraction={fraction} trackColor={palette.line} labelStyle={levelFormat} />
              ) : gauge === 'needle' ? (
                <NeedleGauge levels={levels} fraction={fraction} trackColor={palette.line} labelStyle={levelFormat} />
              ) : (
                <View>
                  <Text className="font-700 text-2xl text-black dark:text-white">
                    {formatLitres(displayLitres)} / {formatLitres(capL)}
                  </Text>
                  <View className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
                    <View
                      style={{
                        width: `${gaugePct}%`,
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: accent,
                      }}
                    />
                  </View>
                </View>
              )}
              {price != null ? (
                <Text className="font-400 mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {fr.fuel.runningOn} {formatPricePerLitre(price)} · {fr.fuel.worth}{' '}
                  {formatFBu(value)}
                  {autonomyKm != null
                    ? ` · ≈ ${Math.round(autonomyKm)} km ${fr.fuel.autonomyLeft}`
                    : ''}
                </Text>
              ) : (
                <Text className="font-400 mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {fills.length === 0 ? fr.fuel.emptyTankHint : fr.fuel.unknownPriceHint}
                </Text>
              )}
              {showReserve ? (
                <Text style={{ color: '#E53935', marginTop: 4 }} className="font-500 text-sm">
                  {fr.fuel.reserveWarning}
                </Text>
              ) : null}
            </View>

            <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <Text className="font-500 text-base text-black dark:text-white">
                {fr.fuel.recentEconomy} : {formatKmPerLitre(recentKmL)}
              </Text>
              <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                {fr.fuel.averageEconomy} : {formatKmPerLitre(replay.overallKmPerLitre)}
              </Text>
            </View>

            <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <Text className="font-500 text-base text-black dark:text-white">
                {fr.fuel.losingTitle}
              </Text>
              {verdict === 'unknown' ? (
                <Text className="font-400 mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {fr.fuel.notEnoughData}
                </Text>
              ) : (
                <View style={{ gap: 6, marginTop: 8 }}>
                  <View
                    className="self-start rounded-full px-3 py-1"
                    style={{
                      backgroundColor:
                        verdict === 'making' ? '#2E7D32' : verdict === 'even' ? '#F9A825' : '#E53935',
                    }}
                  >
                    <Text className="font-500 text-sm text-white">{fr.fuel.verdicts[verdict]}</Text>
                  </View>
                  {stats.trueBreakEvenKmL != null && window30.actualKmL != null ? (
                    <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                      {fr.fuel.breakEvenLine} : {formatKmPerLitre(stats.trueBreakEvenKmL)} ·{' '}
                      {fr.fuel.youLine} : {formatKmPerLitre(window30.actualKmL)}
                    </Text>
                  ) : null}
                  {stats.efficiencyMarginPct != null ? (
                    <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                      {stats.efficiencyMarginPct >= 0
                        ? `Votre moteur peut empirer de ${Math.round(stats.efficiencyMarginPct)} % avant de perdre.`
                        : `Vous êtes à ${Math.round(-stats.efficiencyMarginPct)} % sous le seuil.`}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>

            {lastCycle ? (
              <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
                <Text className="font-500 text-base text-black dark:text-white">
                  {fr.fuel.cycleTitle} #{lastCycle.number} ·{' '}
                  {lastCycle.done ? fr.fuel.cycleDone : fr.fuel.cycleOngoing}
                </Text>
                <Text className="font-400 mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {formatLitres(lastCycle.filledL)} · {formatFBu(lastCycle.fillCostFBu)}
                  {lastCycle.km != null ? ` · ${formatKm(lastCycle.km)}` : ''} ·{' '}
                  {formatFBu(lastCycle.faresFBu)}
                </Text>
                {lastCycle.recoveryPct != null ? (
                  <View style={{ gap: 4, marginTop: 8 }}>
                    <View className="h-3 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
                      <View
                        style={{
                          width: `${Math.min(100, lastCycle.recoveryPct)}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: accent,
                        }}
                      />
                    </View>
                    <Text className="font-500 text-sm text-black dark:text-white">
                      {Math.round(lastCycle.recoveryPct)} %
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {historyKmL.length > 0 ? (
              <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
                <Text className="font-500 text-base text-black dark:text-white">
                  {fr.fuel.historyTitle}
                </Text>
                {historyKmL.map((v, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <View className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
                      <View
                        style={{
                          width: `${Math.min(100, (v / historyMax) * 100)}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: accent,
                        }}
                      />
                    </View>
                    <Text className="font-400 w-20 text-right text-sm text-neutral-600 dark:text-neutral-300">
                      {formatKmPerLitre(v)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <Text className="font-500 text-base text-black dark:text-white">
                {fr.fuel.usageTitle}
              </Text>
              {fills.length === 0 || tripsSinceFill.length === 0 ? (
                <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                  {fr.fuel.usageEmpty}
                </Text>
              ) : (
                <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                  {tripsSinceFill.length} {fr.fuel.usageTrips} · {formatKm(kmSinceFill)}
                  {fuelSinceFill != null ? ` · ≈ ${formatLitres(fuelSinceFill)}` : ''}
                </Text>
              )}
            </View>

            <PrimaryButton
              label={fr.fuel.addFill}
              onPress={() => setSheetOpen(true)}
              icon={<Plus size={20} color="#FFFFFF" />}
            />

            <Text className="font-500 text-lg text-black dark:text-white">
              {fr.fuel.fills}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <View style={{ gap: 2 }}>
              <Text className="font-500 text-base text-black dark:text-white">
                {formatLitres(item.volumeL)} · {formatFBu(item.volumeL * item.pricePerLitre)}
              </Text>
              <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                {formatDayFr(item.ts)}
                {item.station ? ` · ${item.station}` : ''} ·{' '}
                {formatPricePerLitre(item.pricePerLitre)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.fuel.deleteFillHint}
              onPress={() =>
                confirmDelete(
                  item.id,
                  `${formatLitres(item.volumeL)} · ${formatFBu(item.volumeL * item.pricePerLitre)} · ${formatDayFr(item.ts)}${item.station ? ` · ${item.station}` : ''}`,
                )
              }
              className="p-2"
            >
              <Trash2 size={20} color={palette.disabled} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ gap: 4 }}>
            <Text className="font-500 text-base text-black dark:text-white">
              {fr.fuel.noFillsYet}
            </Text>
            <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
              {fr.fuel.noFillsHint}
            </Text>
          </View>
        }
      />

      <FuelFormSheet
        visible={sheetOpen}
        capL={capL}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}
