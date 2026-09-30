import React, { useState } from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Sheet } from '../../ui/sheet';
import { BigField } from '../../ui/input';
import { useAppStore } from '../../store/useAppStore';
import { font, radius, space } from '../../ui/tokens';
import { insertExpense } from '../../db/queries';
import { COST_CATEGORIES } from '../../db/schema';

/** Add a cost. Fuel is deliberately absent: it has its own form and its own maths. */
export default function CostNew() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const router = useRouter();
  const write = useAppStore((s) => s.write);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(COST_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const value = parseNumber(amount);
  const canSave = value !== null && value > 0 && !saving;

  const save = async () => {
    if (!canSave || value === null) return;
    setSaving(true);
    try {
      await write(async (db) => {
        await insertExpense(db, {
          ts: new Date().toISOString(),
          category,
          amount: value,
          odometer_km: null,
          vendor: null,
          note: note.trim() || null,
        });
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible
      title="Add a cost"
      subtitle="Fuel has its own button, because its maths is different."
      onClose={() => router.back()}
      footer={<BigButton label={saving ? 'Saving…' : 'Save cost'} onPress={save} disabled={!canSave} />}
    >
      <Field label="How much">
        <BigField value={amount} onChangeText={setAmount} placeholder="0" suffix="FBU" />
      </Field>

      <Field label="What for">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            {COST_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.chip, category === c && styles.chipActive]}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Field>

      <Field label="Note" hint="Optional. Helps when you are looking back at a bad month.">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything you want to remember"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
      </Field>
    </Sheet>
  );
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, '');
  if (cleaned.length === 0) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, paddingRight: space.lg },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  chipText: { ...font.small, color: colors.textMuted },
  chipTextActive: { color: colors.text, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    ...font.body,
    color: colors.text,
  },
  });