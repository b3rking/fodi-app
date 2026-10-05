import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Input, Preview, Sheet } from '../../ui/sheet';
import { BigField } from '../../ui/input';
import { useAppStore } from '../../store/useAppStore';
import { insertTrip, insertReading, recentPlaces } from '../../db/queries';
import { estimateTripFuel } from '../../core/fuel/allocate';
import { blendedPrice } from '../../core/fuel/engine';
import { fbu, kmPerLitre } from '../../core/format';

/**
 * Nouveau trajet.
 *
 * Quatre tapes pour le cas courant : destination, distance, prix, valider.
 * L'aperçu fait le calcul à voix haute pour qu'il voie le bénéfice avant de
 * valider le chiffre qu'il vient de taper.
 */
export default function TripNew() {
  const router = useRouter();
  const write = useAppStore((s) => s.write);
  const efficiency = useAppStore((s) => s.efficiency);
  const tank = useAppStore((s) => s.tank);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kmText, setKmText] = useState('');
  const [fareText, setFareText] = useState('');
  const [places, setPlaces] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const db = useAppStore.getState().db;
    if (!db) return;
    void recentPlaces(db, 10).then(setPlaces);
  }, []);

  const km = parseNumber(kmText);
  const fare = parseNumber(fareText);
  const fuel = useMemo(
    () => estimateTripFuel(km ?? 0, efficiency, blendedPrice(tank)),
    [km, efficiency, tank]
  );
  const profit = fare !== null && fuel.cost !== null ? fare - fuel.cost : null;

  const fr = (n: number) => n.toFixed(1).replace('.', ',');

  const preview = useMemo(() => {
    if (to.trim().length === 0) return 'Où vas-tu ?';
    if (km === null || km <= 0) return 'C’est combien de kilomètres ?';
    if (fare === null || fare <= 0) return 'Combien le client a-t-il payé ?';
    if (fuel.cost === null) {
      return `Course enregistrée : ${fbu(fare)}. Nous calculerons le coût du carburant dès que ton km/L sera connu.`;
    }
    const bits = [
      `${fr(km)} km pour ${fbu(fare)}.`,
      `Cela consomme environ ${fr(fuel.litres ?? 0)} L de carburant (${fbu(fuel.cost)}).`,
    ];
    if (profit !== null) bits.push(`Bénéfice sur ce trajet ≈ ${fbu(profit)}.`);
    return bits.join(' ');
  }, [to, km, fare, fuel, profit]);

  const canSave =
    to.trim().length > 0 && km !== null && km > 0 && fare !== null && fare > 0 && !saving;

  const save = async () => {
    if (!canSave || km === null || fare === null) return;
    setSaving(true);
    const odoBefore = useAppStore.getState().vehicle?.odometer_km ?? 0;
    const odoAfter = odoBefore + km;
    const nowIso = new Date().toISOString();

    try {
      await write(async (db) => {
        await insertTrip(db, {
          ts: nowIso,
          from_place: from.trim() || '—',
          to_place: to.trim(),
          km,
          fare,
          extras: 0,
          fuel_l: null,
          odo_from_km: odoBefore,
          odo_to_km: odoAfter,
          note: null,
        });
        // Le compteur avance avec le trajet ; le niveau du réservoir non.
        await insertReading(db, nowIso, odoAfter, tank.litres, 'trip');
        await db.runAsync('UPDATE vehicle SET odometer_km = ? WHERE is_default = 1;', odoAfter);
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible
      title="Nouveau trajet"
      subtitle="Destination, distance, prix. C’est tout."
      onClose={() => router.back()}
      footer={
        <BigButton
          label={saving ? 'Enregistrement…' : 'Enregistrer le trajet'}
          onPress={save}
          disabled={!canSave}
        />
      }
    >
      <Field label="Tu vas à">
        <Input value={to} onChangeText={setTo} placeholder="Rohero" />
        {places.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="mt-2 flex-row gap-2 pr-4">
              {places.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setTo(p)}
                  className="rounded-chip border border-line bg-surface-alt px-3 py-1 active:opacity-70"
                >
                  <Text className="text-[11px] text-ink-muted">{p}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </Field>

      <Field label="Tu viens de" hint="Facultatif.">
        <Input value={from} onChangeText={setFrom} placeholder="Nyarugenge" />
      </Field>

      <Field label="Distance">
        <BigField value={kmText} onChangeText={setKmText} placeholder="0,0" suffix="km" />
      </Field>

      <Field
        label="Prix payé"
        hint="Le pourboir ou le péage se met sur le trajet suivant, ou tu modifies celui-ci."
      >
        <BigField value={fareText} onChangeText={setFareText} placeholder="0" suffix="FBU" />
      </Field>

      <Preview>{preview}</Preview>

      <Text className="mt-3 text-[11px] text-ink-faint">
        {efficiency === null
          ? 'Ton km/L n’est pas encore connu. Fais un plein une fois et nous le calculerons.'
          : `Coût du carburant estimé avec ta moyenne de ${kmPerLitre(efficiency)}.`}
      </Text>
    </Sheet>
  );
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.');
  if (cleaned.length === 0) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
