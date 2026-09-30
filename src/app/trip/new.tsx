import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Preview, Sheet } from '../../ui/sheet';
import { BigField } from '../../ui/input';
import { useAppStore } from '../../store/useAppStore';
import { colors, font, radius, space } from '../../ui/tokens';
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
        <BigField value={fareText} onChangeText={setFareText} placeholder="0" suffix="FBU" />
      </Field>

      <Preview>{preview}</Preview>

      {efficiency === null && (
        <Text style={styles.note}>
          Your km/L is not known yet. Fill the tank once and we will work it out.
        </Text>
      )}
      {efficiency !== null && (
        <Text style={styles.note}>Using your average of {kmPerLitre(efficiency)} for fuel cost.</Text>
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

const styles = StyleSheet.create({
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