import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { monthRange, totalsByCategory } from '../core/money/period';
import { formatDayFr, formatFBu } from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { useTripsStore } from '../store/tripsStore';
import { useMoneyStore } from '../store/moneyStore';
import { brandAction } from '../core/theme';
import { fr } from '../i18n/fr';
import { MoneySheet, type MoneySheetState } from './MoneySheet';
import { RecurringSheet, type RecurringSheetState } from './RecurringSheet';
import type { ExpenseRow, IncomeRow } from '../db/database';

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

interface CostLine {
  key: string;
  label: string;
  total: number;
  count: number;
  auto: boolean;
  entries: { key: string; label: string; detail: string; amount: number; auto: boolean; onPress?: () => void }[];
}

export function MoneyScreen() {
  const year = useMoneyStore((s) => s.year);
  const month = useMoneyStore((s) => s.month);
  const categories = useMoneyStore((s) => s.categories);
  const expenses = useMoneyStore((s) => s.expenses);
  const incomes = useMoneyStore((s) => s.incomes);
  const recurrings = useMoneyStore((s) => s.recurrings);
  const occurrences = useMoneyStore((s) => s.occurrences);
  const setMonth = useMoneyStore((s) => s.setMonth);
  const fills = useFuelStore((s) => s.fills);
  const trips = useTripsStore((s) => s.trips);
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  const [sheet, setSheet] = useState<MoneySheetState>({ mode: 'closed' });
  const [ruleSheet, setRuleSheet] = useState<RecurringSheetState>({ mode: 'closed' });
  const [expanded, setExpanded] = useState<string | null>(null);

  const { from, to } = useMemo(() => monthRange(year, month), [year, month]);
  const labelById = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const ruleById = useMemo(() => new Map(recurrings.map((r) => [r.id, r])), [recurrings]);

  const monthTripsFares = useMemo(
    () => trips.filter((t) => t.ts >= from && t.ts < to).reduce((s, t) => s + t.fare + t.extras, 0),
    [trips, from, to],
  );

  // Vue caisse : tout l'argent sorti pour le carburant = les achats du mois,
  // pas le brûlé (le brûlé, lui, sert au profit côté rapports).
  const monthFuelBought = useMemo(
    () =>
      fills
        .filter((f) => f.ts >= from && f.ts < to)
        .reduce((s, f) => s + f.volumeL * f.pricePerLitre + f.feeFBu, 0),
    [fills, from, to],
  );

  const incomesTotal = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const expensesTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const occurrencesTotal = useMemo(() => occurrences.reduce((s, o) => s + o.amount, 0), [occurrences]);

  const moneyIn = monthTripsFares + incomesTotal;
  const moneyOut = monthFuelBought + expensesTotal + occurrencesTotal;

  const costLines: CostLine[] = useMemo(() => {
    const byCat = new Map<string, CostLine>();
    const ensure = (categoryId: string): CostLine => {
      let line = byCat.get(categoryId);
      if (!line) {
        line = {
          key: categoryId,
          label: labelById.get(categoryId) ?? categoryId,
          total: 0,
          count: 0,
          auto: false,
          entries: [],
        };
        byCat.set(categoryId, line);
      }
      return line;
    };
    for (const e of expenses) {
      const line = ensure(e.categoryId);
      line.total += e.amount;
      line.count += 1;
      const entry: CostLine['entries'][number] = {
        key: `e-${e.id}`,
        label: formatFBu(e.amount),
        detail: `${formatDayFr(e.ts)}${e.vendor ? ` · ${e.vendor}` : ''}`,
        amount: e.amount,
        auto: false,
      };
      const row: ExpenseRow = e;
      entry.onPress = () => setSheet({ mode: 'cost', editing: row });
      line.entries.push(entry);
    }
    for (const o of occurrences) {
      const rule = ruleById.get(o.ruleId);
      const line = ensure(rule?.categoryId ?? 'other-cost');
      line.total += o.amount;
      line.count += 1;
      line.auto = true;
      line.entries.push({
        key: o.key,
        label: `${o.label} · ${formatFBu(o.amount)}`,
        detail: `${formatDayFr(o.ts)} · ${fr.money.autoBadge} : ${rule?.label ?? ''} ${formatFBu(rule?.amount ?? o.amount)} ${rule?.cadence === 'weekly' ? fr.money.weekly : fr.money.monthly}`,
        amount: o.amount,
        auto: true,
      });
    }
    return [...byCat.values()].sort((a, b) => b.total - a.total);
  }, [expenses, occurrences, labelById, ruleById]);

  const incomeTotals = useMemo(() => totalsByCategory(incomes), [incomes]);
  const maxCost = costLines[0]?.total ?? 1;

  const goMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    void setMonth(next.year, next.month);
  };

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text className="font-700 text-3xl text-black dark:text-white">{fr.money.title}</Text>

        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mois précédent"
            onPress={() => goMonth(-1)}
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <ChevronLeft size={22} color={iconColor} />
          </Pressable>
          <Text className="font-500 text-lg text-black dark:text-white">
            {fr.months[month]} {year}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mois suivant"
            onPress={() => goMonth(1)}
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <ChevronRight size={22} color={iconColor} />
          </Pressable>
        </View>

        <View className="flex-row gap-2">
          {[
            { label: fr.money.moneyIn, value: moneyIn },
            { label: fr.money.moneyOut, value: moneyOut },
            { label: fr.money.left, value: moneyIn - moneyOut },
          ].map((card) => (
            <View
              key={card.label}
              className="flex-1 items-center gap-1 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800"
            >
              <Text className="font-400 text-xs text-neutral-600 dark:text-neutral-300">
                {card.label}
              </Text>
              <Text className="font-700 text-base text-black dark:text-white">
                {formatFBu(card.value)}
              </Text>
            </View>
          ))}
        </View>

        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.money.taxiFares} : {formatFBu(Math.round(monthTripsFares))}
          {incomesTotal > 0 ? ` · ${fr.money.extraShort} : ${formatFBu(Math.round(incomesTotal))}` : ''}
        </Text>

        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.money.fuelBought} : {formatFBu(Math.round(monthFuelBought))}
        </Text>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.money.addCost}
              onPress={() => setSheet({ mode: 'cost' })}
              className="flex-row items-center justify-center gap-1 rounded-full px-4 py-3"
              style={{ backgroundColor: brandAction }}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text className="font-500 text-base text-white">{fr.money.addCost}</Text>
            </Pressable>
          </View>
          <View className="flex-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.money.addIncome}
              onPress={() => setSheet({ mode: 'income' })}
              className="flex-row items-center justify-center gap-1 rounded-full px-4 py-3"
              style={{ backgroundColor: brandAction }}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text className="font-500 text-base text-white">{fr.money.addIncome}</Text>
            </Pressable>
          </View>
        </View>

        <Text className="font-500 text-lg text-black dark:text-white">
          {fr.money.otherCosts}
        </Text>
        {costLines.length === 0 ? (
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.money.noEntries}
          </Text>
        ) : null}
        {costLines.map((line) => {
          const open = expanded === `cost-${line.key}`;
          return (
            <View key={line.key} className="rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={line.label}
                accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? null : `cost-${line.key}`)}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-500 text-base text-black dark:text-white">
                    {line.label} {line.auto ? `· ${fr.money.autoBadge}` : ''} ({line.count})
                  </Text>
                  <Text className="font-500 text-base text-black dark:text-white">
                    {formatFBu(line.total)}
                  </Text>
                </View>
                <View className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
                  <View
                    style={{
                      width: `${Math.min(100, (line.total / maxCost) * 100)}%`,
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: brandAction,
                    }}
                  />
                </View>
              </Pressable>
              {open
                ? line.entries.map((entry) => (
                    <Pressable
                      key={entry.key}
                      accessibilityRole="button"
                      accessibilityLabel={entry.label}
                      onPress={entry.onPress}
                      className="mt-2 flex-row items-center justify-between"
                    >
                      <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                        {entry.detail}
                        {entry.auto ? ` · ${fr.money.autoBadge}` : ''}
                      </Text>
                      <Text className="font-500 text-sm text-black dark:text-white">
                        {formatFBu(entry.amount)}
                      </Text>
                    </Pressable>
                  ))
                : null}
            </View>
          );
        })}

        <Text className="font-500 text-lg text-black dark:text-white">
          {fr.money.extraIncome}
        </Text>
        {incomeTotals.length === 0 ? (
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.money.noEntries}
          </Text>
        ) : null}
        {incomeTotals.map((t) => {
          const open = expanded === `income-${t.categoryId}`;
          const rows = incomes.filter((i) => i.categoryId === t.categoryId);
          return (
            <View
              key={t.categoryId}
              className="rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={labelById.get(t.categoryId) ?? t.categoryId}
                accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? null : `income-${t.categoryId}`)}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-500 text-base text-black dark:text-white">
                    {labelById.get(t.categoryId) ?? t.categoryId} ({t.count})
                  </Text>
                  <Text className="font-500 text-base text-black dark:text-white">
                    {formatFBu(t.total)}
                  </Text>
                </View>
              </Pressable>
              {open
                ? rows.map((r: IncomeRow) => (
                    <Pressable
                      key={r.id}
                      accessibilityRole="button"
                      accessibilityLabel={formatFBu(r.amount)}
                      onPress={() => setSheet({ mode: 'income', editing: r })}
                      className="mt-2 flex-row items-center justify-between"
                    >
                      <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                        {formatDayFr(r.ts)}
                      </Text>
                      <Text className="font-500 text-sm text-black dark:text-white">
                        {formatFBu(r.amount)}
                      </Text>
                    </Pressable>
                  ))
                : null}
            </View>
          );
        })}

        <View className="flex-row items-center justify-between">
          <Text className="font-500 text-lg text-black dark:text-white">
            {fr.money.recurrings}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fr.money.addRule}
            onPress={() => setRuleSheet({ mode: 'create' })}
            className="flex-row items-center gap-1 rounded-full px-3 py-2"
            style={{ backgroundColor: brandAction }}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text className="font-500 text-sm text-white">{fr.money.addRule}</Text>
          </Pressable>
        </View>
        {recurrings.length === 0 ? (
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.money.noEntries}
          </Text>
        ) : null}
        {recurrings.map((rule) => (
          <Pressable
            key={rule.id}
            accessibilityRole="button"
            accessibilityLabel={rule.label}
            onPress={() => setRuleSheet({ mode: 'edit', rule })}
            className="flex-row items-center justify-between gap-2 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800"
          >
            <View style={{ gap: 2, flex: 1, flexShrink: 1 }}>
              <Text numberOfLines={1} ellipsizeMode="tail" className="font-500 text-base text-black dark:text-white">
                {rule.label} · {fr.money.autoBadge}
                {rule.active === 0 ? ` (${fr.money.inactive})` : ''}
              </Text>
              <Text numberOfLines={1} ellipsizeMode="tail" className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                {formatFBu(rule.amount)} {rule.cadence === 'weekly' ? fr.money.weekly : fr.money.monthly} ·{' '}
                {fr.money.nextOn} {formatDayFr(rule.nextDue)}
              </Text>
            </View>
            <Text className="font-500 text-base text-black dark:text-white">
              {formatFBu(rule.amount)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <MoneySheet state={sheet} onClose={() => setSheet({ mode: 'closed' })} />
      <RecurringSheet state={ruleSheet} onClose={() => setRuleSheet({ mode: 'closed' })} />
    </View>
  );
}
