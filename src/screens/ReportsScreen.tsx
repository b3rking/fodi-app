import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { priceTrips } from '../core/fuel/allocate';
import { blendedPrice, replayFills } from '../core/fuel/engine';
import { perKmStats, verdictFor } from '../core/fuel/breakeven';
import { expandRecurrings } from '../core/money/period';
import { formatDayFr, formatFBu, formatKm, formatKmPerLitre, formatLitres } from '../core/format';
import { listExpenses, listIncomes, type ExpenseRow, type IncomeRow } from '../db/database';
import { useFuelStore } from '../store/fuelStore';
import { useTripsStore } from '../store/tripsStore';
import { useMoneyStore } from '../store/moneyStore';
import { useToastStore } from '../store/toastStore';
import { brandAction } from '../core/theme';
import { PrimaryButton } from '../components/buttons';
import { fr } from '../i18n/fr';

type Preset = 'week' | 'month' | 'year' | 'custom';
const PRESETS: Preset[] = ['week', 'month', 'year', 'custom'];
const PRESET_DAYS: Record<Exclude<Preset, 'custom'>, number> = { week: 7, month: 30, year: 365 };

function parseDay(raw: string): number | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const ts = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function toDayInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface DayPnl {
  key: string;
  ts: number;
  km: number;
  fares: number;
  fuel: number;
  other: number;
  incomes: number;
  profit: number;
}

export function ReportsScreen() {
  const fills = useFuelStore((s) => s.fills);
  const capL = useFuelStore((s) => s.capL);
  const trips = useTripsStore((s) => s.trips);
  const recurrings = useMoneyStore((s) => s.recurrings);
  const showToast = useToastStore((s) => s.show);

  const [preset, setPreset] = useState<Preset>('month');
  const [startStr, setStartStr] = useState(toDayInput(Date.now() - 30 * 86400000));
  const [endStr, setEndStr] = useState(toDayInput(Date.now()));
  const [custom, setCustom] = useState<{ from: number; to: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => Date.now(), []);
  const range = useMemo(() => {
    if (preset === 'custom' && custom) return custom;
    if (preset === 'custom') return { from: now - 30 * 86400000, to: now };
    return { from: now - PRESET_DAYS[preset] * 86400000, to: now };
  }, [preset, custom, now]);
  const { from, to } = range;

  const [monthEntries, setMonthEntries] = useState<{ expenses: ExpenseRow[]; incomes: IncomeRow[] }>({
    expenses: [],
    incomes: [],
  });
  useEffect(() => {
    let cancelled = false;
    void Promise.all([listExpenses(from, to), listIncomes(from, to)]).then(([expenses, incomes]) => {
      if (!cancelled) setMonthEntries({ expenses, incomes });
    });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

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
  const windows = useMemo(
    () =>
      replay.intervals
        .filter((i) => i.consumedL > 1e-9)
        .map((i) => ({ startTs: i.startTs, endTs: i.endTs, consumedL: i.consumedL, costFBu: i.costFBu })),
    [replay],
  );
  const priced = useMemo(() => {
    const map = new Map(
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
    return map;
  }, [trips, windows, blend]);

  const occurrences = useMemo(
    () =>
      expandRecurrings(
        recurrings
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
        to,
      ),
    [recurrings, from, to],
  );

  const tripsR = useMemo(() => trips.filter((t) => t.ts >= from && t.ts < to), [trips, from, to]);
  const revenueKm = useMemo(() => tripsR.reduce((s, t) => s + t.km, 0), [tripsR]);
  const fares = useMemo(() => tripsR.reduce((s, t) => s + t.fare + t.extras, 0), [tripsR]);
  const extraIncomes = useMemo(
    () => monthEntries.incomes.reduce((s, i) => s + i.amount, 0),
    [monthEntries],
  );
  const burnsR = useMemo(
    () => replay.intervals.filter((i) => i.endTs != null && i.endTs >= from && i.endTs < to),
    [replay, from, to],
  );
  const burnL = useMemo(() => burnsR.reduce((s, i) => s + i.consumedL, 0), [burnsR]);
  const burnCost = useMemo(() => burnsR.reduce((s, i) => s + i.costFBu, 0), [burnsR]);
  const burnKm = useMemo(() => burnsR.reduce((s, i) => s + (i.km ?? 0), 0), [burnsR]);
  const otherCosts = useMemo(
    () =>
      monthEntries.expenses.reduce((s, e) => s + e.amount, 0) +
      occurrences.reduce((s, o) => s + o.amount, 0),
    [monthEntries, occurrences],
  );

  const revenue = fares + extraIncomes;
  const profit = revenue - burnCost - otherCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : null;
  const actualKmL = burnL > 1e-9 && burnKm > 0 ? burnKm / burnL : null;
  const stats = perKmStats({
    revenueFBu: revenue,
    revenueKm,
    fuelBurnCostFBu: burnCost,
    otherCostsFBu: otherCosts,
    actualKmLitre: actualKmL,
    blendedPricePerLitre: blend,
    tripCount: tripsR.length,
  });
  const verdict = verdictFor(stats.profitMarginPct, tripsR.length);

  const days: DayPnl[] = useMemo(() => {
    const map = new Map<string, DayPnl>();
    const at = (ts: number): DayPnl => {
      const key = dayKey(ts);
      let d = map.get(key);
      if (!d) {
        d = { key, ts, km: 0, fares: 0, fuel: 0, other: 0, incomes: 0, profit: 0 };
        map.set(key, d);
      }
      return d;
    };
    for (const t of tripsR) {
      const d = at(t.ts);
      d.km += t.km;
      d.fares += t.fare + t.extras;
      d.fuel += priced.get(t.id)?.fuelCostFBu ?? 0;
    }
    for (const i of monthEntries.incomes) at(i.ts).incomes += i.amount;
    for (const e of monthEntries.expenses) at(e.ts).other += e.amount;
    for (const o of occurrences) at(o.ts).other += o.amount;
    for (const d of map.values()) d.profit = d.fares + d.incomes - d.fuel - d.other;
    return [...map.values()].sort((a, b) => a.ts - b.ts);
  }, [tripsR, priced, monthEntries, occurrences]);

  const activeDays = useMemo(() => days.filter((d) => d.fares > 0 || d.other > 0 || d.fuel > 0), [days]);
  const bestDay = useMemo(
    () => (activeDays.length > 0 ? activeDays.reduce((a, b) => (b.profit > a.profit ? b : a)) : null),
    [activeDays],
  );
  const worstDay = useMemo(
    () => (activeDays.length > 0 ? activeDays.reduce((a, b) => (b.profit < a.profit ? b : a)) : null),
    [activeDays],
  );

  const trend = useMemo(() => {
    const buckets: { from: number; profit: number }[] = [];
    const span = to - from;
    const n = Math.max(1, Math.min(12, Math.ceil(span / (7 * 86400000))));
    for (let i = 0; i < n; i++) {
      const bFrom = from + (span / n) * i;
      const bTo = from + (span / n) * (i + 1);
      const p = days
        .filter((d) => d.ts >= bFrom && d.ts < bTo)
        .reduce((s, d) => s + d.profit, 0);
      buckets.push({ from: bFrom, profit: p });
    }
    return buckets;
  }, [days, from, to]);
  const trendMax = Math.max(1, ...trend.map((b) => Math.abs(b.profit)));

  const hasData = tripsR.length > 0 || monthEntries.expenses.length > 0 || monthEntries.incomes.length > 0;

  const applyCustom = () => {
    const start = parseDay(startStr);
    const end = parseDay(endStr);
    if (start == null || end == null || start >= end) {
      setError(fr.reports.errRange);
      return;
    }
    setError(null);
    setCustom({ from: start, to: end + 86400000 });
  };

  const exportCsv = () => {
    try {
      const lines = ['date,km,recettes,carburant,autres,benefice'];
      for (const d of days) {
        lines.push(
          [
            d.key,
            d.km.toFixed(1),
            Math.round(d.fares + d.incomes),
            Math.round(d.fuel),
            Math.round(d.other),
            Math.round(d.profit),
          ].join(','),
        );
      }
      const csv = lines.join('\n');
      void (async () => {
        try {
          const file = new File(Paths.cache, 'fodi-rapport.csv');
          const writer = file.writableStream().getWriter();
          await writer.write(new TextEncoder().encode(csv));
          await writer.close();
          await shareAsync(file.uri);
          showToast(fr.reports.exported);
        } catch {
          showToast(fr.reports.exportFailed);
        }
      })();
    } catch {
      showToast(fr.reports.exportFailed);
    }
  };

  const shareSummary = () => {
    const message =
      `Fodi — ${fr.reports.netProfit} : ${formatFBu(Math.round(profit))} ` +
      `(${formatKm(revenueKm)}, ${tripsR.length} trajets) · ` +
      `${fr.trips.fuelWord} ${formatFBu(Math.round(burnCost))} · ` +
      `${fr.money.otherCosts} ${formatFBu(Math.round(otherCosts))}.`;
    void Share.share({ message });
  };

  const presetLabel = (p: Preset) =>
    p === 'week' ? fr.reports.week : p === 'month' ? fr.reports.month : p === 'year' ? fr.reports.year : fr.reports.custom;

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text className="font-700 text-3xl text-black dark:text-white">{fr.reports.title}</Text>

        <View className="flex-row gap-2">
          {(['week', 'month', 'year', 'custom'] as Preset[]).map((p) => {
            const selected = p === preset;
            return (
              <Pressable
                key={`${p}-${selected ? 'on' : 'off'}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={presetLabel(p)}
                onPress={() => setPreset(p)}
                className={
                  selected
                    ? 'flex-1 items-center rounded-xl px-2 py-2'
                    : 'flex-1 items-center rounded-xl bg-neutral-200 px-2 py-2 dark:bg-neutral-700'
                }
                style={selected ? { backgroundColor: '#FF9800' } : undefined}
              >
                <Text
                  className={
                    selected ? 'font-500 text-sm text-white' : 'font-400 text-sm text-black dark:text-white'
                  }
                >
                  {presetLabel(p)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {preset === 'custom' ? (
          <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
            <View className="flex-row gap-3">
              <View style={{ gap: 4, flex: 1 }}>
                <Text className="font-500 text-sm text-black dark:text-white">{fr.reports.start}</Text>
                <TextInput
                  value={startStr}
                  onChangeText={setStartStr}
                  keyboardType="numeric"
                  className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
                />
              </View>
              <View style={{ gap: 4, flex: 1 }}>
                <Text className="font-500 text-sm text-black dark:text-white">{fr.reports.end}</Text>
                <TextInput
                  value={endStr}
                  onChangeText={setEndStr}
                  keyboardType="numeric"
                  className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
                />
              </View>
            </View>
            {error ? (
              <Text style={{ color: '#E53935' }} className="font-500 text-sm">
                {error}
              </Text>
            ) : null}
            <PrimaryButton label={fr.reports.apply} onPress={applyCustom} />
          </View>
        ) : null}

        {!hasData ? (
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.reports.noData}
          </Text>
        ) : (
          <View style={{ gap: 16 }}>
            <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                {fr.reports.netProfit}
              </Text>
              <Text className="font-700 text-3xl text-black dark:text-white">
                {formatFBu(Math.round(profit))}
              </Text>
              <Text className="font-400 mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                {fr.reports.margin} {margin != null ? `${Math.round(margin)} %` : '—'}
                {stats.trueBreakEvenKmL != null && stats.efficiencyMarginPct != null
                  ? ` · Seuil ${formatKmPerLitre(stats.trueBreakEvenKmL)}`
                  : ''}
                {verdict !== 'unknown' ? ` · ${fr.fuel.verdicts[verdict]}` : ''}
              </Text>
            </View>

            <View className="gap-1 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <ReportLine label={fr.reports.kilometres} value={formatKm(revenueKm)} />
              <ReportLine
                label={fr.reports.fares}
                value={`${formatFBu(Math.round(fares))}${revenueKm > 0 ? ` (${formatFBu(Math.round(fares / revenueKm))}${fr.reports.perKm})` : ''}`}
              />
              <ReportLine label={fr.reports.extraIncome} value={formatFBu(Math.round(extraIncomes))} />
              <ReportLine
                label={fr.reports.fuelBurned}
                value={`${formatLitres(burnL)} · ${formatFBu(Math.round(burnCost))}`}
              />
              <ReportLine label={fr.reports.otherCosts} value={formatFBu(Math.round(otherCosts))} />
            </View>

            <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              {trend.map((b, i) => (
                <View key={i} className="flex-row items-center gap-2">
                  <View className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
                    <View
                      style={{
                        width: `${Math.min(100, (Math.abs(b.profit) / trendMax) * 100)}%`,
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: b.profit >= 0 ? '#2E7D32' : '#E53935',
                      }}
                    />
                  </View>
                  <Text className="font-400 w-24 text-right text-sm text-neutral-600 dark:text-neutral-300">
                    {formatFBu(Math.round(b.profit))}
                  </Text>
                </View>
              ))}
            </View>

            {bestDay || worstDay ? (
              <View className="gap-1 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
                {bestDay ? (
                  <ReportLine
                    label={`${fr.reports.bestDay} · ${formatDayFr(bestDay.ts)}`}
                    value={formatFBu(Math.round(bestDay.profit))}
                  />
                ) : null}
                {worstDay && worstDay !== bestDay ? (
                  <ReportLine
                    label={`${fr.reports.worstDay} · ${formatDayFr(worstDay.ts)}`}
                    value={formatFBu(Math.round(worstDay.profit))}
                  />
                ) : null}
              </View>
            ) : null}

            <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <Text className="font-500 text-base text-black dark:text-white">
                {fr.reports.whereItGoes}
              </Text>
              <WhereRow label={fr.trips.fuelWord} value={burnCost} max={Math.max(burnCost, otherCosts, 1)} />
              <WhereRow label={fr.money.otherCosts} value={otherCosts} max={Math.max(burnCost, otherCosts, 1)} />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={fr.reports.exportCsv}
                  onPress={exportCsv}
                  className="items-center rounded-full bg-neutral-200 px-4 py-3 dark:bg-neutral-700"
                >
                  <Text className="font-500 text-base text-black dark:text-white">
                    {fr.reports.exportCsv}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={fr.reports.shareSummary}
                  onPress={shareSummary}
                  className="items-center rounded-full bg-neutral-200 px-4 py-3 dark:bg-neutral-700"
                >
                  <Text className="font-500 text-base text-black dark:text-white">
                    {fr.reports.shareSummary}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">{label}</Text>
      <Text className="font-500 text-sm text-black dark:text-white">{value}</Text>
    </View>
  );
}

function WhereRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <View style={{ gap: 4 }}>
      <View className="flex-row items-center justify-between">
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">{label}</Text>
        <Text className="font-500 text-sm text-black dark:text-white">{formatFBu(Math.round(value))}</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
        <View
          style={{
            width: `${Math.min(100, (value / max) * 100)}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: brandAction,
          }}
        />
      </View>
    </View>
  );
}
