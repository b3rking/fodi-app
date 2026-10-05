import React, { useMemo, useState } from 'react';
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

  const [litresText, setLitresText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [station, setStation] = useState('');
  const [level, setLevel] = useState<LevelPreset>('full');
  const [saving, setSaving] = useState(false);

  const litres = parseNumber(litresText);
  const price = parseNumber(priceText);
  const capacity = tank.capacityL;
  const litresBefore = tank.litres;
  const litresAfter = capacity * FILL_LEVELS[level];
  const litresAfterBuy = litresBefore + (litres ?? 0);
  const burned = Math.max(0, litresBefore - litresAfter);
  const overfill = litres !== null && litres > maxFillableL(tank) + 0.01;

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
        // La lecture est la base de tous les calculs de consommation.
        await insertReading(db, nowIso, odometer, litresAfter, 'fuel');
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

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
        <TankGauge
          litres={litresAfterBuy}
          capacityL={capacity}
          reserveL={tank.reserveL}
          blendedPrice={newBlended}
        />
      </View>

      {overfill && (
        <View className="mb-4">
          <Warning>
            Le réservoir contient {capacity} L et il y en a déjà {fr(litresBefore)} L. Tu ne peux
            ajouter que {fr(maxFillableL(tank))} L. Vérifie la quantité.
          </Warning>
        </View>
      )}

      <Preview>{preview}</Preview>
    </Sheet>
  );
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.');
  if (cleaned.length === 0) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
