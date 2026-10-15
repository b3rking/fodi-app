import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { formatDayFr, formatFBu } from '../core/format';
import { useMoneyStore } from '../store/moneyStore';
import { useToastStore } from '../store/toastStore';
import { useThemeStore } from '../store/themeStore';
import { PrimaryButton, SecondaryButton } from '../components/buttons';
import type { ExpenseRow, IncomeRow } from '../db/database';
import { fr } from '../i18n/fr';

function parseFrNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

export type MoneySheetState =
  | { mode: 'closed' }
  | { mode: 'cost'; editing?: ExpenseRow }
  | { mode: 'income'; editing?: IncomeRow };

export function MoneySheet({ state, onClose }: { state: MoneySheetState; onClose: () => void }) {
  const visible = state.mode !== 'closed';
  const kind = state.mode === 'income' ? 'income' : 'cost';
  const editing = state.mode !== 'closed' ? state.editing : undefined;

  const categories = useMoneyStore((s) => s.categories);
  const addExpense = useMoneyStore((s) => s.addExpense);
  const editExpense = useMoneyStore((s) => s.editExpense);
  const removeExpense = useMoneyStore((s) => s.removeExpense);
  const restoreExpense = useMoneyStore((s) => s.restoreExpense);
  const addIncome = useMoneyStore((s) => s.addIncome);
  const editIncome = useMoneyStore((s) => s.editIncome);
  const removeIncome = useMoneyStore((s) => s.removeIncome);
  const restoreIncome = useMoneyStore((s) => s.restoreIncome);
  const showToast = useToastStore((s) => s.show);
  const accent = useThemeStore((s) => s.accent);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const placeholder = isDark ? '#737373' : '#A3A3A3';

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [vendor, setVendor] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const kindCategories = categories.filter((c) => c.kind === kind);
  const isIncome = kind === 'income';

  useEffect(() => {
    if (!visible) return;
    setAmount(editing ? String(editing.amount) : '');
    setCategoryId(editing ? editing.categoryId : '');
    const vendorValue =
      editing && 'vendor' in editing && typeof editing.vendor === 'string'
        ? editing.vendor
        : '';
    setVendor(vendorValue);
    setNote(editing?.note ?? '');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = () => {
    const amountNum = parseFrNumber(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError(fr.money.errAmount);
      return;
    }
    if (categoryId === '') {
      setError(fr.money.errCategory);
      return;
    }
    const ts = editing ? editing.ts : Date.now();
    const done = () => {
      showToast(isIncome ? fr.toast.incomeSaved : fr.toast.costSaved);
      onClose();
    };
    const failed = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
    if (isIncome) {
      const input = { ts, categoryId, amount: amountNum, note: note.trim() === '' ? null : note.trim() };
      if (editing) void editIncome(editing.id, input).then(done, failed);
      else void addIncome(input).then(done, failed);
    } else {
      const input = {
        ts,
        categoryId,
        amount: amountNum,
        vendor: vendor.trim() === '' ? null : vendor.trim(),
        note: note.trim() === '' ? null : note.trim(),
      };
      if (editing) void editExpense(editing.id, input).then(done, failed);
      else void addExpense(input).then(done, failed);
    }
  };

  const remove = () => {
    if (!editing) return;
    const detail = `${formatFBu(editing.amount)} · ${formatDayFr(editing.ts)}`;
    Alert.alert(
      isIncome ? fr.money.deleteIncomeTitle : fr.money.deleteCostTitle,
      detail,
      [
        { text: fr.money.cancel, style: 'cancel' },
        {
          text: fr.money.deleteConfirm,
          style: 'destructive',
          onPress: () => {
            const after = () => onClose();
            if (isIncome) {
              void removeIncome(editing.id).then((snapshot) => {
                if (snapshot) {
                  showToast(fr.toast.incomeDeleted, {
                    label: fr.toast.undo,
                    onPress: () => void restoreIncome(snapshot),
                  });
                }
                after();
              });
            } else {
              void removeExpense(editing.id).then((snapshot) => {
                if (snapshot) {
                  showToast(fr.toast.costDeleted, {
                    label: fr.toast.undo,
                    onPress: () => void restoreExpense(snapshot),
                  });
                }
                after();
              });
            }
          },
        },
      ],
    );
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
              {editing
                ? isIncome
                  ? fr.money.editIncome
                  : fr.money.editCost
                : isIncome
                  ? fr.money.newIncome
                  : fr.money.newCost}
            </Text>

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
              <Text className={labelClass}>{fr.money.category}</Text>
              <View className="flex-row flex-wrap gap-2">
                {kindCategories.map((c) => {
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

            {!isIncome ? (
              <View style={{ gap: 4 }}>
                <Text className={labelClass}>{fr.money.vendor}</Text>
                <TextInput
                  value={vendor}
                  onChangeText={setVendor}
                  placeholderTextColor={placeholder}
                  className={inputClass}
                />
              </View>
            ) : null}

            <View style={{ gap: 4 }}>
              <Text className={labelClass}>{fr.money.note}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholderTextColor={placeholder}
                className={inputClass}
              />
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
                accessibilityLabel={isIncome ? fr.money.deleteIncomeHint : fr.money.deleteCostHint}
                onPress={remove}
                className="items-center rounded-full px-4 py-3"
              >
                <Text style={{ color: '#E53935' }} className="font-500 text-base">
                  {fr.money.delete}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
