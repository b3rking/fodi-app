import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Plus, Trash2 } from 'lucide-react-native';
import { replayFills, totalLitres, tankCost, blendedPrice } from '../core/fuel/engine';
import {
  formatDayFr,
  formatFBu,
  formatKmPerLitre,
  formatLitres,
  formatPricePerLitre,
} from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { brandAction, darkPalette, lightPalette } from '../core/theme';
import { useColorScheme } from 'nativewind';
import { fr } from '../i18n/fr';
import { FuelFormSheet } from './FuelFormSheet';

const RESERVE_L = 7;

export function FuelScreen() {
  const fills = useFuelStore((s) => s.fills);
  const capL = useFuelStore((s) => s.capL);
  const lastLitresAfterL = useFuelStore((s) => s.lastLitresAfterL);
  const removeFill = useFuelStore((s) => s.removeFill);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? darkPalette : lightPalette;

  // Écrasement du bouton Plein au toucher (retour tactile animé).
  const pleinScale = useSharedValue(1);
  const pleinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pleinScale.value }],
  }));

  const confirmDelete = (id: number, detail: string) => {
    Alert.alert(fr.fuel.deleteTitle, detail, [
      { text: fr.fuel.cancel, style: 'cancel' },
      {
        text: fr.fuel.deleteConfirm,
        style: 'destructive',
        onPress: () => void removeFill(id),
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

  const litres = totalLitres(replay.tank);
  const price = blendedPrice(replay.tank);
  const value = tankCost(replay.tank);
  const gaugePct = Math.min(100, (litres / capL) * 100);
  const recentKmL = [...replay.intervals].reverse().find((i) => i.kmPerLitre != null)?.kmPerLitre ?? null;
  const autonomyKm =
    replay.overallKmPerLitre != null ? litres * replay.overallKmPerLitre : null;
  const showReserve = fills.length > 0 && litres < RESERVE_L;

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
              <Text className="font-700 text-2xl text-black dark:text-white">
                {formatLitres(litres)} / {formatLitres(capL)}
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

            <Animated.View style={pleinStyle}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={fr.fuel.addFill}
                onPress={() => setSheetOpen(true)}
                onPressIn={() => {
                  pleinScale.value = withSpring(0.96, { damping: 12, stiffness: 400 });
                }}
                onPressOut={() => {
                  pleinScale.value = withSpring(1, { damping: 12, stiffness: 400 });
                }}
                className="flex-row items-center justify-center gap-2 rounded-full px-4 py-3"
                style={{ backgroundColor: brandAction }}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text className="font-500 text-base text-white">{fr.fuel.addFill}</Text>
              </Pressable>
            </Animated.View>

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
        litresBeforeDefault={lastLitresAfterL}
        hasHistory={fills.length > 0}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}
