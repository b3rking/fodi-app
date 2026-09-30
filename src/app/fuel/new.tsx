import React, { useMemo, useState } from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Preview, Sheet, Warning } from '../../ui/sheet';
import { useAppStore } from '../../store/useAppStore';
import { font, radius, space, FONT_FAMILY } from '../../ui/tokens';
import { TankGauge } from '../../ui/gauge';
import { BigField } from '../../ui/input';
import { FILL_LEVELS, levelLabel, type LevelPreset } from '../../core/levels';
import { insertFuelBuy, insertReading } from '../../db/queries';
import { fbu, fbuPerLitre } from '../../core/format';
import { blendedPrice, maxFillableL } from '../../core/fuel/engine';

/**
 * Fueled Up.
 *
 * The most important form in the app, because everything downstream depends on
 * it being right. It asks for two numbers (litres, price) plus which station,
 * and derives the rest. The live preview tells him in plain English what the
 * entry will do to his tank and his fuel economy before he saves.
 */
export default function FuelNew() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const router = useRouter();
  const write = useAppStore((s) => s.write);
  const tank = useAppStore((s) => s.tank);
  const efficiency = useAppStore((s) => s.efficiency);

  const [litresText, setLitresText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [station, setStation] = useState('');
  const [level, setLevel] = useState<LevelPreset>('full');
  const [saving, setSaving] = useState(false);

  const litres = parseNumber(litresText);
  const price = parseNumber(priceText);
  const capacity = tank.capacityL;
  const litresAfter = capacity * FILL_LEVELS[level];
  const litresBefore = tank.litres;
  const litresAfterBuy = litresBefore + (litres ?? 0);
  const burned = Math.max(0, litresBefore - litresAfter);
  const overfill = litres !== null && litres > maxFillableL(tank) + 0.01;

  const preview = useMemo(() => {
    const fr = (n: number) => n.toFixed(1).replace('.', ',');

    if (litres === null || litres <= 0) {
      return 'Entre la quantité de carburant mise dans le réservoir.';
    }
    if (price === null || price <= 0) {
      return 'Maintenant, le prix par litre.';
    }

    const parts: string[] = [];
    parts.push(`Tu as mis ${fr(litres)} L pour ${fbu(litres * price)}.`);

    if (overfill) {
      parts.push(
        `C’est plus que ce que le réservoir peut contenir : il ne reste que ${fr(
          maxFillableL(tank)
        )} L de place dans ${capacity} L.`
      );
    }

    if (burned > 0.01) {
      parts.push(`Depuis ton dernier plein, tu as brûlé ${fr(burned)} L.`);
    }

    if (litresAfterBuy <= capacity + 0.01) {
      parts.push(`Le réservoir contient maintenant ${fr(litresAfterBuy)} L sur ${capacity} L.`);
    }

    return parts.join(' ');
  }, [litres, price, overfill, burned, litresBefore, litresAfterBuy, capacity, maxFillableL(tank)]);

  const canSave = litres !== null && litres > 0 && price !== null && price > 0 && !saving;

  const save = async () => {
    if (!canSave || litres === null || price === null) return;
    setSaving(true);
    const odometer = useAppStore.getState().vehicle?.odometer_km ?? 0;
    const nowIso = new Date().toISOString();
    const amount = litres * price;

    try {
      await write(async (db) => {
        await insertFuelBuy(db, {
          ts: nowIso,
          station: station.trim() || null,
          volume_l: litres,
          price_per_l: price,
          amount,
          fee: 0,
          odometer_km: odometer,
          fill_level: level,
          paid: 1,
          receipt_uri: null,
        });
        // The reading is what the consumption maths is built on.
        await insertReading(db, nowIso, odometer, litresAfter, 'fuel');
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible
      title="Plein de carburant"
      subtitle="Deux nombres et la station. Le reste, on s’en occupe."
      onClose={() => router.back()}
      footer={<BigButton label={saving ? 'Enregistrement…' : 'Enregistrer ce plein'} onPress={save} disabled={!canSave} />}
    >
      <Field label="Quantité mise dans le réservoir">
        <BigField
          value={litresText}
          onChangeText={setLitresText}
          placeholder="0,0"
          keyboardType="decimal-pad"
          suffix="L"
        />
      </Field>

      <Field
        label="Prix par litre"
        hint={`Soit ${price !== null && price > 0 ? fbuPerLitre(price) : '—'} de carburant.`}
      >
        <BigField
          value={priceText}
          onChangeText={setPriceText}
          placeholder="0"
          keyboardType="number-pad"
          suffix="FBU/L"
        />
      </Field>

      <Field label="Station">
        <TextInput
          value={station}
          onChangeText={setStation}
          placeholder="Nom de la station"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
      </Field>

      <Field
        label="Niveau du réservoir maintenant"
        hint="Cinq gros boutons. On ne te demande jamais de taper une fraction."
      >
        <View style={styles.levels}>
          {(['empty', 'quarter', 'half', 'three_quarter', 'full'] as LevelPreset[]).map((l) => (
            <Pressable
              key={l}
              onPress={() => setLevel(l)}
              style={[styles.levelButton, level === l && styles.levelButtonActive]}
            >
              <Text style={[styles.levelText, level === l && styles.levelTextActive]}>
                {levelLabel(l)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <View style={styles.gaugeWrap}>
        <TankGauge
          litres={litresAfterBuy}
          capacityL={capacity}
          reserveL={tank.reserveL}
          blendedPrice={price !== null && litresAfterBuy > 0 ? ((tank.cost + (litres ?? 0) * (price ?? 0)) / litresAfterBuy) : blendedPrice(tank)}
        />
      </View>

      {overfill && (
        <View style={{ marginBottom: space.md }}>
          <Warning>
            Le réservoir contient {capacity} L et il y en a déjà {litresBefore.toFixed(1).replace('.', ',')} L.
            Tu ne peux ajouter que {maxFillableL(tank).toFixed(1).replace('.', ',')} L. Vérifie la quantité.
          </Warning>
        </View>
      )}

      <Preview>{preview}</Preview>
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
  levels: { flexDirection: 'row', gap: space.sm },
  levelButton: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  levelButtonActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  levelText: { ...font.tiny, color: colors.textMuted },
  levelTextActive: { color: colors.text, fontFamily: FONT_FAMILY.bold },
  gaugeWrap: { marginBottom: space.lg },
  });