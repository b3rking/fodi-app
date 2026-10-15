import React, { useMemo, useState } from 'react';
import { Pressable, SectionList, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { allocateFuel, priceTrips, windowForTs, type BurnWindow } from '../core/fuel/allocate';
import { blendedPrice, replayFills } from '../core/fuel/engine';
import { formatDayFr, formatFBu, formatKm, formatLitres } from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { useTripsStore } from '../store/tripsStore';
import { useThemeStore } from '../store/themeStore';
import { fr } from '../i18n/fr';
import { PrimaryButton } from '../components/buttons';
import { TripSheet, type TripSheetState } from './TripSheet';
import type { TripRow } from '../db/database';

type Filter = 'today' | 'week' | 'month' | 'all';
const FILTERS: Filter[] = ['today', 'week', 'month', 'all'];

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function filterSince(filter: Filter): number {
  const now = Date.now();
  if (filter === 'today') return startOfToday();
  if (filter === 'week') return now - 7 * 24 * 3600 * 1000;
  if (filter === 'month') return now - 30 * 24 * 3600 * 1000;
  return 0;
}

interface RowModel extends TripRow {
  fuelL: number | null;
  fuelCostFBu: number | null;
  profitFBu: number | null;
}

export function TripsScreen() {
  const trips = useTripsStore((s) => s.trips);
  const fills = useFuelStore((s) => s.fills);
  const capL = useFuelStore((s) => s.capL);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accent = useThemeStore((s) => s.accent);
  const [filter, setFilter] = useState<Filter>('today');
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<TripSheetState>({ mode: 'closed' });

  const since = filterSince(filter);
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      trips.filter(
        (t) =>
          t.ts >= since &&
          (q === '' ||
            t.toPlace.toLowerCase().includes(q) ||
            (t.fromPlace ?? '').toLowerCase().includes(q)),
      ),
    [trips, since, q],
  );

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
  const blend = blendedPrice(replay.tank);
  const windows: BurnWindow[] = useMemo(
    () =>
      replay.intervals
        .filter((i) => i.consumedL > 1e-9)
        .map((i) => ({
          startTs: i.startTs,
          endTs: i.endTs,
          consumedL: i.consumedL,
          costFBu: i.costFBu,
        })),
    [replay],
  );

  const rows: RowModel[] = useMemo(() => {
    const priced = new Map(
      priceTrips(
        trips.map((t) => ({
          id: t.id,
          ts: t.ts,
          km: t.km,
          fare: t.fare,
          extras: t.extras,
          manualFuelL: t.fuelL,
        })),
        windows,
        blend,
      ).map((p) => [p.tripId, p]),
    );
    return trips.map((t) => {
      const p = priced.get(t.id);
      return {
        ...t,
        fuelL: p?.fuelL ?? null,
        fuelCostFBu: p?.fuelCostFBu ?? null,
        profitFBu: p?.profitFBu ?? null,
      };
    });
  }, [trips, windows, blend]);

  const visibleRows = useMemo(
    () => rows.filter((r) => visible.some((v) => v.id === r.id)),
    [rows, visible],
  );

  const totals = useMemo(() => {
    const km = visibleRows.reduce((s, r) => s + r.km, 0);
    const fares = visibleRows.reduce((s, r) => s + r.fare + r.extras, 0);
    const fuel = visibleRows.reduce((s, r) => s + (r.fuelCostFBu ?? 0), 0);
    const known = visibleRows.some((r) => r.fuelCostFBu != null);
    return { km, fares, fuel: known ? fuel : null };
  }, [visibleRows]);

  const sections = useMemo(() => {
    const byDay = new Map<string, { ts: number; rows: RowModel[] }>();
    for (const r of [...visibleRows].sort((a, b) => b.ts - a.ts)) {
      const key = formatDayFr(r.ts);
      const group = byDay.get(key) ?? { ts: r.ts, rows: [] };
      group.rows.push(r);
      byDay.set(key, group);
    }
    return [...byDay.entries()].map(([title, g]) => ({ title, total: g.rows.reduce((s, r) => s + r.fare + r.extras, 0), data: g.rows }));
  }, [visibleRows]);

  return (
    <View className="flex-1">
      <View style={{ padding: 24, paddingBottom: 0, gap: 12 }}>
        <Text className="font-700 text-3xl text-black dark:text-white">{fr.trips.title}</Text>
        <View className="flex-row gap-2">
          {FILTERS.map((f) => {
            const selected = f === filter;
            return (
              <Pressable
                key={`${f}-${selected ? 'on' : 'off'}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={fr.trips.filters[f]}
                onPress={() => setFilter(f)}
                className={
                  selected
                    ? 'flex-1 items-center rounded-full px-2 py-2'
                    : 'flex-1 items-center rounded-full bg-neutral-200 px-2 py-2 dark:bg-neutral-700'
                }
                style={selected ? { backgroundColor: accent } : undefined}
              >
                <Text
                  className={
                    selected
                      ? 'font-500 text-sm text-white'
                      : 'font-400 text-sm text-black dark:text-white'
                  }
                >
                  {fr.trips.filters[f]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={fr.trips.searchPlaceholder}
          placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
          className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
        />
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {formatKm(totals.km)} · {formatFBu(totals.fares)}
          {totals.fuel != null ? ` · ${fr.trips.fuelWord} ${formatFBu(totals.fuel)}` : ''}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 24, paddingTop: 12, gap: 12 }}
        ListHeaderComponent={
          <PrimaryButton label={fr.trips.addTrip} onPress={() => setSheet({ mode: 'create' })} />
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-center justify-between">
            <Text className="font-500 text-base text-black dark:text-white">{section.title}</Text>
            <Text className="font-500 text-base text-black dark:text-white">
              {formatFBu(section.total)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.fromPlace ?? ''} ${item.toPlace}`}
            onPress={() => setSheet({ mode: 'edit', trip: item })}
            className="rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800"
          >
            <Text className="font-500 text-base text-black dark:text-white">
              {item.fromPlace ? `${item.fromPlace} → ${item.toPlace}` : item.toPlace}
            </Text>
            <Text className="font-400 text-sm text-black dark:text-white">
              {formatKm(item.km)} · {formatFBu(item.fare + item.extras)}
            </Text>
            <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
              {item.fuelL != null && item.fuelCostFBu != null
                ? `${fr.trips.fuelWord} ${formatLitres(item.fuelL)} (${formatFBu(item.fuelCostFBu)})${item.profitFBu != null && item.km > 0 ? ` · ${fr.trips.profitWord} ${formatFBu(item.profitFBu)} (${formatFBu(Math.round(item.profitFBu / item.km))}/km)` : ''}`
                : '—'}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ padding: 24, gap: 4 }}>
            <Text className="font-500 text-base text-black dark:text-white">
              {fr.trips.noTripsYet}
            </Text>
            <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
              {fr.trips.noTripsHint}
            </Text>
          </View>
        }
      />

      <TripSheet state={sheet} onClose={() => setSheet({ mode: 'closed' })} />
    </View>
  );
}
