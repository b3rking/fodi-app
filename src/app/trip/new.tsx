import React, { useEffect, useMemo, useState } from 'react';
<<<<<<< HEAD
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Input, Preview, Sheet } from '../../ui/sheet';
import { BigField } from '../../ui/input';
import { useAppStore } from '../../store/useAppStore';
=======
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Preview, Sheet } from '../../ui/sheet';
import { BigField } from '../../ui/input';
import { useAppStore } from '../../store/useAppStore';
import { font, radius, space } from '../../ui/tokens';
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
import { insertTrip, insertReading, recentPlaces } from '../../db/queries';
import { estimateTripFuel } from '../../core/fuel/allocate';
import { blendedPrice } from '../../core/fuel/engine';
import { fbu, kmPerLitre } from '../../core/format';

/**
<<<<<<< HEAD
 * Nouveau trajet.
 *
 * Quatre tapes pour le cas courant : destination, distance, prix, valider.
 * L'aperçu fait le calcul à voix haute pour qu'il voie le bénéfice avant de
 * valider le chiffre qu'il vient de taper.
 */
export default function TripNew() {
=======
 * New trip.
 *
 * Four taps for the common case: destination, distance, fare, save. The
 * preview does the arithmetic out loud so he can see the profit before he
 * commits to the number he typed.
 */
export default function TripNew() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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

<<<<<<< HEAD
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
=======
  const preview = useMemo(() => {
    if (to.trim().length === 0) return 'Where are you going?';
    if (km === null || km <= 0) return 'How far is the trip?';
    if (fare === null || fare <= 0) return 'How much did the passenger pay?';
    if (fuel.cost === null) {
      return `Fare ${fbu(fare)} recorded. We will work out the fuel cost once we know your km/L.`;
    }
    const bits = [
      `${km.toFixed(1)} km for ${fbu(fare)}.`,
      `That burns about ${fuel.litres?.toFixed(1)} L of fuel (${fbu(fuel.cost)}).`,
    ];
    if (profit !== null) {
      bits.push(`Profit on this trip ≈ ${fbu(profit)}.`);
    }
    return bits.join(' ');
  }, [to, km, fare, fuel, profit]);

  const canSave = to.trim().length > 0 && km !== null && km > 0 && fare !== null && fare > 0 && !saving;
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db

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
<<<<<<< HEAD
        // Le compteur avance avec le trajet ; le niveau du réservoir non.
=======
        // The odometer moves with the trip; the tank level does not.
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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
<<<<<<< HEAD
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
=======
      title="New trip"
      subtitle="Destination, distance, fare. That is all."
      onClose={() => router.back()}
      footer={<BigButton label={saving ? 'Saving…' : 'Save trip'} onPress={save} disabled={!canSave} />}
    >
      <Field label="Going to">
        <TextInput
          value={to}
          onChangeText={setTo}
          placeholder="Rohero"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
        {places.length > 0 && (
          <View style={styles.chips}>
            {places.map((p) => (
              <Pressable key={p} onPress={() => setTo(p)} style={styles.chip}>
                <Text style={styles.chipText}>{p}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Field>

      <Field label="Coming from" hint="Optional.">
        <TextInput
          value={from}
          onChangeText={setFrom}
          placeholder="Nyarugenge"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
      </Field>

      <Field label="Distance">
        <BigField value={kmText} onChangeText={setKmText} placeholder="0.0" suffix="km" />
      </Field>

      <Field label="Fare paid" hint="Any tip or toll goes in the next trip, or edit this one later.">
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        <BigField value={fareText} onChangeText={setFareText} placeholder="0" suffix="FBU" />
      </Field>

      <Preview>{preview}</Preview>

<<<<<<< HEAD
      <Text className="mt-3 text-[11px] text-ink-faint">
        {efficiency === null
          ? 'Ton km/L n’est pas encore connu. Fais un plein une fois et nous le calculerons.'
          : `Coût du carburant estimé avec ta moyenne de ${kmPerLitre(efficiency)}.`}
      </Text>
=======
      {efficiency === null && (
        <Text style={styles.note}>
          Your km/L is not known yet. Fill the tank once and we will work it out.
        </Text>
      )}
      {efficiency !== null && (
        <Text style={styles.note}>Using your average of {kmPerLitre(efficiency)} for fuel cost.</Text>
      )}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { ...font.tiny, color: colors.textMuted },
  note: { ...font.tiny, color: colors.textFaint, marginTop: space.md },
  });
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
