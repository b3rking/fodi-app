import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { buildDailyPnl } from '../core/money/dayPnl';
import { priceTrips } from '../core/fuel/allocate';
import { blendedPrice, replayFills, replayLiveTank, totalLitres } from '../core/fuel/engine';
import { perKmStats, verdictFor } from '../core/fuel/breakeven';
import { expandRecurrings } from '../core/money/period';
import { formatDayFr, formatFBu, formatKm, formatLitres } from '../core/format';
import { listExpenses, listIncomes } from '../db/database';
import { useFuelStore } from '../store/fuelStore';
import { useTripsStore } from '../store/tripsStore';
import { useMoneyStore } from '../store/moneyStore';
import { useToastStore } from '../store/toastStore';
import { useWorkdayStore } from '../store/workdayStore';
import { useColorScheme } from 'nativewind';
import { darkPalette, lightPalette } from '../core/theme';
import { useThemeStore } from '../store/themeStore';
import { PrimaryButton, SecondaryButton } from '../components/buttons';
import { BarsGauge } from '../components/FuelGauges';
import { TripSheet, type TripSheetState } from './TripSheet';
import { FuelFormSheet } from './FuelFormSheet';
import { MoneySheet, type MoneySheetState } from './MoneySheet';
import { fr } from '../i18n/fr';

function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatHours(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

function formatHour(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseFrNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

export function TodayScreen() {
  const fills = useFuelStore((s) => s.fills);
  const capL = useFuelStore((s) => s.capL);
  const levels = useFuelStore((s) => s.levels);
  const trips = useTripsStore((s) => s.trips);
  const tripsLastOdo = useTripsStore((s) => s.lastOdoKm);
  const fuelLastOdo = useFuelStore((s) => s.lastOdoKm);
  const recurrings = useMoneyStore((s) => s.recurrings);
  const showToast = useToastStore((s) => s.show);
  const today = useWorkdayStore((s) => s.today);
  const openDay = useWorkdayStore((s) => s.openDay);
  const closeDay = useWorkdayStore((s) => s.closeDay);
  const accent = useThemeStore((s) => s.accent);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = isDark ? darkPalette : lightPalette;
  const levelFormat = useFuelStore((s) => s.levelFormat);

  const [odo, setOdo] = useState('');
  const [fuel, setFuel] = useState('');
  const [dayError, setDayError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [tripSheet, setTripSheet] = useState<TripSheetState>({ mode: 'closed' });
  const [fuelOpen, setFuelOpen] = useState(false);
  const [moneySheet, setMoneySheet] = useState<MoneySheetState>({ mode: 'closed' });

  const todayStart = useMemo(() => startOfToday(), []);
  const now = Date.now();

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

  const tripsToday = useMemo(() => trips.filter((t) => t.ts >= todayStart), [trips, todayStart]);
  const faresToday = useMemo(() => tripsToday.reduce((s, t) => s + t.fare + t.extras, 0), [tripsToday]);
  const kmToday = useMemo(() => tripsToday.reduce((s, t) => s + t.km, 0), [tripsToday]);
  const fuelToday = useMemo(
    () => tripsToday.reduce((s, t) => s + (priced.get(t.id)?.fuelCostFBu ?? 0), 0),
    [tripsToday, priced],
  );

  const [todayEntries, setTodayEntries] = useState<{ other: number; incomes: number; bought: number }>({
    other: 0,
    incomes: 0,
    bought: 0,
  });
  useEffect(() => {
    let cancelled = false;
    void Promise.all([listExpenses(todayStart, now), listIncomes(todayStart, now)]).then(
      ([exps, incs]) => {
        if (cancelled) return;
        const occ = expandRecurrings(
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
          todayStart,
          now,
        );
        const bought = fills
          .filter((f) => f.ts >= todayStart)
          .reduce((s, f) => s + f.volumeL * f.pricePerLitre + f.feeFBu, 0);
        setTodayEntries({
          other: exps.reduce((s, e) => s + e.amount, 0) + occ.reduce((s, o) => s + o.amount, 0),
          incomes: incs.reduce((s, i) => s + i.amount, 0),
          bought,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [todayStart, now, recurrings, fills]);

  const profitToday = faresToday + todayEntries.incomes - fuelToday - todayEntries.other;
  const cashToday = faresToday + todayEntries.incomes - todayEntries.bought - todayEntries.other;

  const stats = useMemo(
    () =>
      perKmStats({
        revenueFBu: faresToday + todayEntries.incomes,
        revenueKm: kmToday,
        fuelBurnCostFBu: fuelToday,
        otherCostsFBu: todayEntries.other,
        actualKmLitre: replay.overallKmPerLitre,
        blendedPricePerLitre: blend,
        tripCount: tripsToday.length,
      }),
    [faresToday, todayEntries, kmToday, fuelToday, replay, blend, tripsToday],
  );
  const verdict = verdictFor(stats.profitMarginPct, tripsToday.length);

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
        trips.filter((t) => t.ts > (fills.length > 0 ? fills[fills.length - 1].ts : 0)).map((t) => ({ ts: t.ts, km: t.km, fuelL: t.fuelL })),
      ),
    [capL, fills, trips],
  );
  const displayLitres = totalLitres(live.tank);
  const fraction = capL > 0 ? Math.min(1, Math.max(0, displayLitres / capL)) : 0;

  // Journée : heures + écart compteur/trajets (mauvais usage).
  const opened = today?.startedTs != null;
  const closed = today?.endedTs != null;
  const hoursMs = opened ? (closed && today?.endedTs ? today.endedTs - today.startedTs! : now - today!.startedTs!) : 0;
  const odoKm =
    today?.odoStart != null && today?.odoEnd != null && today.odoEnd > today.odoStart
      ? today.odoEnd - today.odoStart
      : null;
  const unexplainedKm = odoKm != null ? Math.max(0, odoKm - kmToday) : null;
  const misuse =
    unexplainedKm != null && odoKm != null && odoKm > 0 && unexplainedKm > Math.max(2, odoKm * 0.1);

  const lastOdo = Math.max(tripsLastOdo ?? -1, fuelLastOdo ?? -1);
  const fuelNum = fuel.trim() === '' ? null : parseFrNumber(fuel);

  const submitDay = (closing: boolean) => {
    const odoNum = parseFrNumber(odo);
    if (!Number.isFinite(odoNum) || odoNum < 0) {
      setDayError(fr.today.errOdo);
      return;
    }
    if (fuelNum != null && (!Number.isFinite(fuelNum) || fuelNum < 0)) {
      setDayError(fr.today.errFuel);
      return;
    }
    if (closing && today?.odoStart != null && odoNum < today.odoStart) {
      setDayError(fr.today.errOdo);
      return;
    }
    setDayError(null);
    setOdo('');
    setFuel('');
    void (closing ? closeDay(odoNum, fuelNum) : openDay(odoNum, fuelNum)).then(
      () => showToast(fr.toast.settingsSaved),
      (e: unknown) => setDayError(e instanceof Error ? e.message : String(e)),
    );
  };

  // Bandeau 7 jours.
  const weekDays = useMemo(() => {
    const keys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const pad = (n: number) => String(n).padStart(2, '0');
      keys.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }
    return keys;
  }, [now]);
  const [weekEntries, setWeekEntries] = useState<{
    expenses: { ts: number; amount: number }[];
    incomes: { ts: number; amount: number }[];
    occurrences: { ts: number; amount: number }[];
  }>({ expenses: [], incomes: [], occurrences: [] });
  useEffect(() => {
    const from = now - 7 * 86400000;
    let cancelled = false;
    void Promise.all([listExpenses(from, now), listIncomes(from, now)]).then(([exps, incs]) => {
      if (cancelled) return;
      const occ = expandRecurrings(
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
        now,
      );
      setWeekEntries({ expenses: exps, incomes: incs, occurrences: occ });
    });
    return () => {
      cancelled = true;
    };
  }, [now, recurrings]);
  const weekPnl = useMemo(
    () =>
      buildDailyPnl({
        trips: trips
          .filter((t) => t.ts >= now - 7 * 86400000)
          .map((t) => ({
            ts: t.ts,
            km: t.km,
            fare: t.fare,
            extras: t.extras,
            fuelCostFBu: priced.get(t.id)?.fuelCostFBu ?? null,
          })),
        expenses: weekEntries.expenses,
        incomes: weekEntries.incomes,
        occurrences: weekEntries.occurrences,
      }),
    [trips, priced, weekEntries, now],
  );
  const weekByKey = useMemo(() => new Map(weekPnl.map((d) => [d.key, d])), [weekPnl]);
  const weekMax = Math.max(1, ...weekPnl.map((d) => Math.abs(d.profit)));
  const selected = selectedDay ? weekByKey.get(selectedDay) ?? null : null;

  const elapsedH = hoursMs / 3600000;
  const pace = opened && elapsedH >= 0.25 ? (profitToday / Math.max(elapsedH, 0.25)) * 12 : null;

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text className="font-700 text-3xl text-black dark:text-white">{fr.today.title}</Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {formatDayFr(todayStart)}
        </Text>

        <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
          {!opened ? (
            <View style={{ gap: 8 }}>
              <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                {fr.today.odoStart}
              </Text>
              <TextInput
                value={odo}
                onChangeText={(v) => {
                  setOdo(v);
                  setDayError(null);
                }}
                keyboardType="numeric"
                placeholder={lastOdo >= 0 ? String(lastOdo) : ''}
                placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
                className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
              />
              <TextInput
                value={fuel}
                onChangeText={(v) => {
                  setFuel(v);
                  setDayError(null);
                }}
                keyboardType="decimal-pad"
                placeholder={fr.today.fuelStartHint}
                className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
              />
              <PrimaryButton label={fr.today.openDay} onPress={() => submitDay(false)} />
            </View>
          ) : (
            <View style={{ gap: 4 }}>
              <Text className="font-500 text-base text-black dark:text-white">
                {fr.today.openedAt} {today?.startedTs ? formatHour(today.startedTs) : ''} ·{' '}
                {fr.today.hoursWorked} : {formatHours(hoursMs)}
              </Text>
              <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                {fr.today.dayKm} : {formatKm(kmToday)} · {tripsToday.length} {fr.today.tripsToday}
                {odoKm != null ? ` · ${fr.today.odoKm} : ${formatKm(odoKm)}` : ''}
              </Text>
              {today?.fuelStartL != null ? (
                <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                  {fr.fuel.runningOn} : {formatLitres(today.fuelStartL)}
                </Text>
              ) : null}
              {today?.fuelEndL != null ? (
                <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                  {fr.today.closedAt} {today?.endedTs ? formatHour(today.endedTs) : ''} ·{' '}
                  {fr.today.fuelEnd} : {formatLitres(today.fuelEndL)}
                </Text>
              ) : null}
              {today?.fuelStartL != null ? (
                <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                  {fr.fuel.runningOn} : {formatLitres(today.fuelStartL)}
                </Text>
              ) : null}
              {today?.fuelEndL != null ? (
                <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                  {fr.today.closedAt} {today?.endedTs ? formatHour(today.endedTs) : ''} ·{' '}
                  {fr.today.fuelEnd} : {formatLitres(today.fuelEndL)}
                </Text>
              ) : null}
              {misuse ? (
                <Text style={{ color: '#E53935' }} className="font-500 text-sm">
                  {formatKm(unexplainedKm ?? 0)} {fr.today.unexplainedKm}. {fr.today.misuseAlert}
                </Text>
              ) : null}
              {!closed ? (
                <View className="mt-2" style={{ gap: 8 }}>
                  <TextInput
                    value={odo}
                    onChangeText={(v) => {
                      setOdo(v);
                      setDayError(null);
                    }}
                    keyboardType="numeric"
                    placeholder={fr.today.odoEnd}
                    className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
                  />
                  <TextInput
                    value={fuel}
                    onChangeText={(v) => {
                      setFuel(v);
                      setDayError(null);
                    }}
                    keyboardType="decimal-pad"
                    placeholder={fr.today.fuelEndHint}
                    className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
                  />
                  <PrimaryButton label={fr.today.closeDay} onPress={() => submitDay(true)} />
                </View>
              ) : (
                <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                  {fr.today.closedAt} {today?.endedTs ? formatHour(today.endedTs) : ''}
                </Text>
              )}
            </View>
          )}
          {dayError ? (
            <Text style={{ color: '#E53935' }} className="font-500 text-sm">
              {dayError}
            </Text>
          ) : null}
        </View>

        <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.today.profitToday}
          </Text>
          <Text className="font-700 text-4xl text-black dark:text-white">
            {formatFBu(Math.round(profitToday))}
          </Text>
          <Text className="font-400 mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {formatFBu(Math.round(faresToday))} − {formatFBu(Math.round(fuelToday))} −{' '}
            {formatFBu(Math.round(todayEntries.other))}
          </Text>
          <Text className="font-400 mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.today.cashTitle} : {formatFBu(Math.round(cashToday))}
          </Text>
          <Text className="font-400 text-xs text-neutral-500 dark:text-neutral-400">
            {fr.today.cashHint}
          </Text>
          {pace != null ? (
            <Text className="font-400 mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {fr.today.paceTitle} : {formatFBu(Math.round(pace))} ({fr.today.paceHint})
            </Text>
          ) : null}
        </View>

        <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <View
            className="self-start rounded-full px-3 py-1"
            style={{
              backgroundColor:
                verdict === 'making' ? '#2E7D32' : verdict === 'even' ? '#F9A825' : verdict === 'losing' ? '#E53935' : '#757575',
            }}
          >
            <Text className="font-500 text-sm text-white">{fr.fuel.verdicts[verdict]}</Text>
          </View>
          {stats.efficiencyMarginPct != null && verdict !== 'unknown' ? (
            <Text className="font-400 mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              {stats.efficiencyMarginPct >= 0
                ? `Votre moteur peut empirer de ${Math.round(stats.efficiencyMarginPct)} % avant de perdre.`
                : `Vous êtes à ${Math.round(-stats.efficiencyMarginPct)} % sous le seuil.`}
            </Text>
          ) : null}
        </View>

        <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <BarsGauge levels={levels} fraction={capL > 0 ? Math.min(1, displayLitres / capL) : 0} trackColor={palette.line} labelStyle={levelFormat} />
        </View>

        <PrimaryButton label={fr.trips.addTrip} onPress={() => setTripSheet({ mode: 'create' })} />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <SecondaryButton label={fr.fuel.addFill} onPress={() => setFuelOpen(true)} />
          </View>
          <View className="flex-1">
            <SecondaryButton label={fr.money.addCost} onPress={() => setMoneySheet({ mode: 'cost' })} />
          </View>
        </View>

        <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <Text className="font-500 text-base text-black dark:text-white">
            {fr.today.last7days}
          </Text>
          {weekDays.map((key) => {
            const d = weekByKey.get(key);
            const active = selectedDay === key;
            return (
              <Pressable
                key={`${key}-${active ? 'on' : 'off'}`}
                accessibilityRole="button"
                accessibilityLabel={key}
                onPress={() => setSelectedDay(active ? null : key)}
                className="flex-row items-center gap-2"
              >
                <Text className="font-400 w-16 text-sm text-neutral-600 dark:text-neutral-300">
                  {key.slice(8, 10)}/{key.slice(5, 7)}
                </Text>
                <View className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
                  <View
                    style={{
                      width: d ? `${Math.min(100, (Math.abs(d.profit) / weekMax) * 100)}%` : '0%',
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: d && d.profit < 0 ? '#E53935' : accent,
                    }}
                  />
                </View>
                <Text className="font-400 w-24 text-right text-sm text-neutral-600 dark:text-neutral-300">
                  {d ? formatFBu(Math.round(d.profit)) : '—'}
                </Text>
              </Pressable>
            );
          })}
          <Text className="font-400 text-xs text-neutral-500 dark:text-neutral-400">
            {fr.today.tapDay}
          </Text>
          {selected ? (
            <View style={{ gap: 2 }} className="rounded-xl bg-neutral-200 p-3 dark:bg-neutral-700">
              <Text className="font-500 text-base text-black dark:text-white">
                {formatDayFr(selected.ts)} · {formatFBu(Math.round(selected.profit))}
              </Text>
              <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                {formatKm(selected.km)} · {formatFBu(Math.round(selected.fares))} −{' '}
                {formatFBu(Math.round(selected.fuel))} − {formatFBu(Math.round(selected.other))}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <TripSheet state={tripSheet} onClose={() => setTripSheet({ mode: 'closed' })} />
      <FuelFormSheet visible={fuelOpen} capL={capL} onClose={() => setFuelOpen(false)} />
      <MoneySheet state={moneySheet} onClose={() => setMoneySheet({ mode: 'closed' })} />
    </View>
  );
}
