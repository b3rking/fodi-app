import React, { useMemo, useState } from 'react';
<<<<<<< HEAD
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Input, Preview, Sheet, Warning } from '../../ui/sheet';
import { BigField } from '../../ui/input';
import { TankGauge } from '../../ui/gauge';
import { useAppStore } from '../../store/useAppStore';
import { insertFuelBuy, insertReading } from '../../db/queries';
import { fbu, fbuPerLitre } from '../../core/format';
import { blendedPrice, maxFillableL } from '../../core/fuel/engine';
import { LEVEL_PRESETS, FILL_LEVELS, levelLabel, type LevelPreset } from '../../core/levels';

/**
 * Plein de carburant.
 *
 * Le formulaire le plus important de l'application, parce que tout le reste en
 * dépend. Il demande deux nombres (litres, prix) plus la station, et déduit le
 * reste. L'aperçu en direct dit en français courant ce que cette saisie va
 * faire au réservoir, avant d'enregistrer quoi que ce soit.
 */
export default function FuelNew() {
  const router = useRouter();
  const write = useAppStore((s) => s.write);
  const tank = useAppStore((s) => s.tank);
=======
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Preview, Sheet, Warning } from '../../ui/sheet';
import { useAppStore } from '../../store/useAppStore';
import { font, radius, space } from '../../ui/tokens';
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db

  const [litresText, setLitresText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [station, setStation] = useState('');
  const [level, setLevel] = useState<LevelPreset>('full');
  const [saving, setSaving] = useState(false);

  const litres = parseNumber(litresText);
  const price = parseNumber(priceText);
  const capacity = tank.capacityL;
<<<<<<< HEAD
  const litresBefore = tank.litres;
  const litresAfter = capacity * FILL_LEVELS[level];
=======
  const litresAfter = capacity * FILL_LEVELS[level];
  const litresBefore = tank.litres;
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  const litresAfterBuy = litresBefore + (litres ?? 0);
  const burned = Math.max(0, litresBefore - litresAfter);
  const overfill = litres !== null && litres > maxFillableL(tank) + 0.01;

<<<<<<< HEAD
  const fr = (n: number) => n.toFixed(1).replace('.', ',');

  const preview = useMemo(() => {
    if (litres === null || litres <= 0) {
      return 'Entre la quantité de carburant mise dans le réservoir.';
    }
    if (price === null || price <= 0) {
      return 'Maintenant, le prix par litre.';
    }
    const parts: string[] = [`Tu as mis ${fr(litres)} L pour ${fbu(litres * price)}.`];

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
=======
  const preview = useMemo(() => {
    if (litres === null || litres <= 0) {
      return 'Enter how many litres you put in.';
    }
    if (price === null || price <= 0) {
      return 'Now enter the price per litre.';
    }

    const parts: string[] = [];
    parts.push(
      `You added ${litres.toFixed(1)} L for ${fbu(litres * price)}.`
    );

    if (overfill) {
      parts.push(
        `That is more than the tank has room for — only ${maxFillableL(tank).toFixed(1)} L will fit in ${capacity} L.`
      );
    }

    if (burned > 0.01) {
      parts.push(`Since your last fill you burned ${burned.toFixed(1)} L.`);
      if (efficiency && efficiency > 0) {
        parts.push(`That fuel is what was in the tank, priced at what you paid for it.`);
      }
    }

    if (litresAfterBuy <= capacity + 0.01) {
      parts.push(`Tank now holds ${litresAfterBuy.toFixed(1)} of ${capacity} L.`);
    }

    return parts.join(' ');
  }, [litres, price, overfill, burned, litresBefore, litresAfterBuy, capacity, efficiency, maxFillableL(tank)]);
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db

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
<<<<<<< HEAD
        // La lecture est la base de tous les calculs de consommation.
=======
        // The reading is what the consumption maths is built on.
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        await insertReading(db, nowIso, odometer, litresAfter, 'fuel');
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

<<<<<<< HEAD
  const newBlended =
    price !== null && litresAfterBuy > 0
      ? (tank.cost + (litres ?? 0) * (price ?? 0)) / litresAfterBuy
      : blendedPrice(tank);

  return (
    <Sheet
      visible
      title="Plein de carburant"
      subtitle="Deux nombres et la station. Le reste, on s’en occupe."
      onClose={() => router.back()}
      footer={
        <BigButton
          label={saving ? 'Enregistrement…' : 'Enregistrer ce plein'}
          onPress={save}
          disabled={!canSave}
        />
      }
    >
      <Field label="Quantité mise dans le réservoir">
        <BigField
          value={litresText}
          onChangeText={setLitresText}
          placeholder="0,0"
=======
  return (
    <Sheet
      visible
      title="Fueled up"
      subtitle="Two numbers and where you bought it. We do the rest."
      onClose={() => router.back()}
      footer={<BigButton label={saving ? 'Saving…' : 'Save this fill'} onPress={save} disabled={!canSave} />}
    >
      <Field label="Litres you put in">
        <BigField
          value={litresText}
          onChangeText={setLitresText}
          placeholder="0.0"
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
          keyboardType="decimal-pad"
          suffix="L"
        />
      </Field>

      <Field
<<<<<<< HEAD
        label="Prix par litre"
        hint={`Soit ${price !== null && price > 0 ? fbuPerLitre(price) : '—'} de carburant.`}
=======
        label="Price per litre"
        hint={`That is ${price !== null && price > 0 ? fbuPerLitre(price) : '—'} for a full tank of fuel.`}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
      >
        <BigField
          value={priceText}
          onChangeText={setPriceText}
          placeholder="0"
          keyboardType="number-pad"
          suffix="FBU/L"
        />
      </Field>

<<<<<<< HEAD
      <Field label="Station">
        <Input value={station} onChangeText={setStation} placeholder="Nom de la station" />
      </Field>

      <Field
        label="Niveau du réservoir maintenant"
        hint="Cinq gros boutons. On ne te demande jamais de taper une fraction."
      >
        <View className="flex-row gap-2">
          {LEVEL_PRESETS.map((l) => {
            const active = level === l;
            return (
              <Pressable
                key={l}
                onPress={() => setLevel(l)}
                className={`flex-1 items-center rounded-control border py-3 active:opacity-70 ${
                  active ? 'border-accent bg-accent-dim' : 'border-line bg-surface-alt'
                }`}
              >
                <Text className={`text-[11px] ${active ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                  {levelLabel(l)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <View className="mb-5">
=======
      <Field label="Where">
        <TextInput
          value={station}
          onChangeText={setStation}
          placeholder="Station name"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
      </Field>

      <Field label="Tank level now" hint="Five big buttons. We never make you type a fraction.">
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        <TankGauge
          litres={litresAfterBuy}
          capacityL={capacity}
          reserveL={tank.reserveL}
<<<<<<< HEAD
          blendedPrice={newBlended}
=======
          blendedPrice={price !== null && litresAfterBuy > 0 ? ((tank.cost + (litres ?? 0) * (price ?? 0)) / litresAfterBuy) : blendedPrice(tank)}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        />
      </View>

      {overfill && (
<<<<<<< HEAD
        <View className="mb-4">
          <Warning>
            Le réservoir contient {capacity} L et il y en a déjà {fr(litresBefore)} L. Tu ne peux
            ajouter que {fr(maxFillableL(tank))} L. Vérifie la quantité.
=======
        <View style={{ marginBottom: space.md }}>
          <Warning>
            The tank only holds {capacity} L and it already has {litresBefore.toFixed(1)} L. Check
            the litres — you can only add {maxFillableL(tank).toFixed(1)} L.
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
          </Warning>
        </View>
      )}

      <Preview>{preview}</Preview>
    </Sheet>
  );
}

function parseNumber(text: string): number | null {
<<<<<<< HEAD
  const cleaned = text.replace(/\s/g, '').replace(',', '.');
=======
  const cleaned = text.replace(/[,\s]/g, '');
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  if (cleaned.length === 0) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
<<<<<<< HEAD
=======

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
  levelTextActive: { color: colors.text, fontWeight: '700' },
  gaugeWrap: { marginBottom: space.lg },
  });
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
