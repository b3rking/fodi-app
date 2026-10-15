import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { formatDayFr, formatFBu } from '../core/format';
import { useMoneyStore } from '../store/moneyStore';
import { useToastStore } from '../store/toastStore';
import { useThemeStore } from '../store/themeStore';
import { PrimaryButton, SecondaryButton } from '../components/buttons';
import type { RecurringRow } from '../db/database';
import { fr } from '../i18n/fr';

function parseFrNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

function parseDay(raw: string): number | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const ts = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function toDayInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type RecurringSheetState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; rule: RecurringRow };

export function RecurringSheet({ state, onClose }: { state: RecurringSheetState; onClose: () => void }) {
  const visible = state.mode !== 'closed';
  const editing = state.mode === 'edit' ? state.rule : null;

  const categories = useMoneyStore((s) => s.categories);
  const addRecurring = useMoneyStore((s) => s.addRecurring);
  const editRecurring = useMoneyStore((s) => s.editRecurring);
  const removeRecurring = useMoneyStore((s) => s.removeRecurring);
  const showToast = useToastStore((s) => s.show);
  const accent = useThemeStore((s) => s.accent);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const placeholder = isDark ? '#737373' : '#A3A3A3';

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<'weekly' | 'monthly'>('monthly');
  const [nextDue, setNextDue] = useState('');
  const [categoryId, setCategoryId] = useState('data');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const costCategories = categories.filter((c) => c.kind === 'cost');

  useEffect(() => {
    if (!visible) return;
    setLabel(editing?.label ?? '');
    setAmount(editing ? String(editing.amount) : '');
    setCadence(editing?.cadence ?? 'monthly');
    setNextDue(editing ? toDayInput(editing.nextDue) : toDayInput(Date.now()));
    setCategoryId(editing?.categoryId ?? 'data');
    setActive(editing ? editing.active === 1 : true);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = () => {
    const amountNum = parseFrNumber(amount);
    if (label.trim() === '') {
      setError(fr.money.errLabel);
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError(fr.money.errAmount);
      return;
    }
    const due = parseDay(nextDue);
    if (due == null) {
      setError(fr.money.errDate);
      return;
    }
    const input = {
      label: label.trim(),
      amount: amountNum,
      cadence,
      nextDue: due,
      categoryId,
      active: active ? 1 : 0,
    };
    const done = () => {
      showToast(fr.toast.ruleSaved);
      onClose();
    };
    const failed = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
    if (editing) void editRecurring(editing.id, input).then(done, failed);
    else void addRecurring(input).then(done, failed);
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert(fr.money.deleteRuleTitle, `${editing.label} · ${formatFBu(editing.amount)}`, [
      { text: fr.money.cancel, style: 'cancel' },
      {
        text: fr.money.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          void removeRecurring(editing.id).then(() => {
            showToast(fr.toast.ruleDeleted);
            onClose();
          });
        },
      },
    ]);
  };

  const inputClass =
    'rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white';
  const labelClass = 'font-500 text-sm text-black dark:text-white';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[92%] rounded-t-3xl bg-white dark:bg-neutral-900">
          <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
            <Text className="font-700 text-xl text-black dark:text-white">
              {editing ? fr.money.editRule : fr.money.newRule}
            </Text>

            <View style={{ gap: 4 }}>
              <Text className={labelClass}>{fr.money.ruleLabel}</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Data mensuel"
                placeholderTextColor={placeholder}
                className={inputClass}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text className={labelClass}>{fr.money.amount}</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="15000"
                placeholderTextColor={placeholder}
                className={inputClass}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text className={labelClass}>{fr.money.cadence}</Text>
              <View className="flex-row gap-2">
                {(['weekly', 'monthly'] as const).map((option) => {
                  const selected = option === cadence;
                  return (
                    <Pressable
                      key={`${option}-${selected ? 'on' : 'off'}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option === 'weekly' ? fr.money.weekly : fr.money.monthly}
                      onPress={() => setCadence(option)}
                      className={
                        selected
                          ? 'flex-1 items-center rounded-xl px-2 py-2'
                          : 'flex-1 items-center rounded-xl bg-neutral-200 px-2 py-2 dark:bg-neutral-700'
                      }
                      style={selected ? { backgroundColor: accent } : undefined}
                    >
                      <Text
                        className={
                          selected ? 'font-500 text-sm text-white' : 'font-400 text-sm text-black dark:text-white'
                        }
                      >
                        {option === 'weekly' ? fr.money.weekly : fr.money.monthly}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text className={labelClass}>{fr.money.nextDue}</Text>
              <TextInput
                value={nextDue}
                onChangeText={setNextDue}
                keyboardType="numeric"
                placeholder="2026-10-04"
                placeholderTextColor={placeholder}
                className={inputClass}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text className={labelClass}>{fr.money.category}</Text>
              <View className="flex-row flex-wrap gap-2">
                {costCategories.map((c) => {
                  const selected = c.id === categoryId;
                  return (
                    <Pressable
                      key={`${c.id}-${selected ? 'on' : 'off'}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={c.label}
                      onPress={() => setCategoryId(c.id)}
                      className={
                        selected
                          ? 'rounded-full px-3 py-1'
                          : 'rounded-full bg-neutral-200 px-3 py-1 dark:bg-neutral-700'
                      }
                      style={selected ? { backgroundColor: accent } : undefined}
                    >
                      <Text
                        className={selected ? 'font-500 text-sm text-white' : 'font-400 text-sm text-black dark:text-white'}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className={labelClass}>{fr.money.active}</Text>
              <Switch value={active} onValueChange={setActive} />
            </View>

            {error ? (
              <Text style={{ color: '#E53935' }} className="font-500 text-sm">
                {error}
              </Text>
            ) : null}

            <View className="flex-row gap-3">
              <SecondaryButton label={fr.money.cancel} onPress={onClose} />
              <PrimaryButton label={fr.money.save} onPress={save} />
            </View>

            {editing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={fr.money.deleteRuleHint}
                onPress={remove}
                className="items-center rounded-full px-4 py-3"
              >
                <Text style={{ color: '#E53935' }} className="font-500 text-base">
                  {fr.money.delete}
                </Text>
              </Pressable>
            ) : null}

            {editing ? (
              <Text className="font-400 text-xs text-neutral-500 dark:text-neutral-400">
                {formatFBu(editing.amount)} · {formatDayFr(editing.nextDue)}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
