import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Input, Sheet } from '../../ui/sheet';
import { BigField } from '../../ui/input';
import { useAppStore } from '../../store/useAppStore';
import { insertExpense } from '../../db/queries';
import { COST_CATEGORIES } from '../../db/schema';

/** Ajouter une dépense. Le carburant a son propre écran, car son calcul est différent. */
export default function CostNew() {
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
      title="Ajouter une dépense"
      subtitle="Le carburant a son propre bouton, parce que son calcul est différent."
      onClose={() => router.back()}
      footer={
        <BigButton
          label={saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
          onPress={save}
          disabled={!canSave}
        />
      }
    >
      <Field label="Combien">
        <BigField value={amount} onChangeText={setAmount} placeholder="0" suffix="FBU" />
      </Field>

      <Field label="Pour quoi">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 pr-4">
            {COST_CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  className={`rounded-chip border px-3 py-2 active:opacity-70 ${
                    active ? 'border-accent bg-accent-dim' : 'border-line bg-surface-alt'
                  }`}
                >
                  <Text className={`text-small ${active ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Field>

      <Field label="Note" hint="Facultatif. Utile quand tu regardes un mauvais mois en arrière.">
        <Input value={note} onChangeText={setNote} placeholder="Ce que tu veux retenir" />
      </Field>
    </Sheet>
  );
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.');
  if (cleaned.length === 0) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
