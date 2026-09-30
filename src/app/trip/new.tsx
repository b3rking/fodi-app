import React, { useEffect, useMemo, useState } from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Preview, Sheet } from '../../ui/sheet';
import { BigField } from '../../ui/input';
import { useAppStore } from '../../store/useAppStore';
import { font, radius, space } from '../../ui/tokens';
import { insertTrip, insertReading, recentPlaces } from '../../db/queries';
import { estimateTripFuel } from '../../core/fuel/allocate';
import { blendedPrice } from '../../core/fuel/engine';
import { fbu, kmPerLitre } from '../../core/format';

/**
 * New trip.
 *
 * Four taps for the common case: destination, distance, fare, save. The
 * preview does the arithmetic out loud so he can see the profit before he
 * commits to the number he typed.
 */
export default function TripNew() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

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

  const preview = useMemo(() => {
    const fr = (n: number) => n.toFixed(1).replace('.', ',');

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
    if (profit !== null) {
      bits.push(`Bénéfice sur ce trajet ≈ ${fbu(profit)}.`);
    }
    return bits.join(' ');
  }, [to, km, fare, fuel, profit]);

  const canSave = to.trim().length > 0 && km !== null && km > 0 && fare !== null && fare > 0 && !saving;

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
        // The odometer moves with the trip; the tank level does not.
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
      footer={<BigButton label={saving ? 'Enregistrement…' : 'Enregistrer le trajet'} onPress={save} disabled={!canSave} />}
    >
      <Field label="Tu vas à">
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

      <Field label="Tu viens de" hint="Facultatif.">
        <TextInput
          value={from}
          onChangeText={setFrom}
          placeholder="Nyarugenge"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
      </Field>

      <Field label="Distance">
        <BigField value={kmText} onChangeText={setKmText} placeholder="0,0" suffix="km" />
      </Field>

      <Field label="Prix payé" hint="Le pourboir ou le péage se met sur le trajet suivant, ou tu modifies celui-ci.">
        <BigField value={fareText} onChangeText={setFareText} placeholder="0" suffix="FBU" />
      </Field>

      <Preview>{preview}</Preview>

      {efficiency === null && (
        <Text style={styles.note}>
          Ton km/L n’est pas encore connu. Fais un plein une fois et nous le calculerons.
        </Text>
      )}
      {efficiency !== null && (
        <Text style={styles.note}>
          Coût du carburant estimé avec ta moyenne de {kmPerLitre(efficiency)}.
        </Text>
      )}
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