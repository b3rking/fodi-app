import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { replayFills, replayLiveTank, totalLitres, tankCost, blendedPrice } from '../core/fuel/engine';
import {
  formatDayFr,
  formatFBu,
  formatKm,
  formatKmPerLitre,
  formatLitres,
  formatPricePerLitre,
} from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { brandAction, darkPalette, lightPalette } from '../core/theme';
import { useColorScheme } from 'nativewind';
import { fr } from '../i18n/fr';
import { FuelFormSheet } from './FuelFormSheet';
import { PrimaryButton } from '../components/buttons';
import { BarsGauge, NeedleGauge } from '../components/FuelGauges';
import { useToastStore } from '../store/toastStore';
import { useTripsStore } from '../store/tripsStore';

const RESERVE_L = 7;

export function FuelScreen() {
  const fills = useFuelStore((s) => s.fills);
  const capL = useFuelStore((s) => s.capL);
  const levels = useFuelStore((s) => s.levels);
  const gauge = useFuelStore((s) => s.gauge);
  const levelFormat = useFuelStore((s) => s.levelFormat);
  const trips = useTripsStore((s) => s.trips);
  const removeFill = useFuelStore((s) => s.removeFill);
  const restoreFill = useFuelStore((s) => s.restoreFill);
  const showToast = useToastStore((s) => s.show);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? darkPalette : lightPalette;

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
                        backgroundColor: brandAction,
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
