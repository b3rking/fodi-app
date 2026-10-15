import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { blendedPrice, replayFills } from '../core/fuel/engine';
import { formatFBu, formatKm, formatKmPerLitre, formatLitres } from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { useTripsStore } from '../store/tripsStore';
import { useToastStore } from '../store/toastStore';
import { PrimaryButton, SecondaryButton } from '../components/buttons';
import type { NewTrip, TripRow } from '../db/database';
import { fr } from '../i18n/fr';

function parseFrNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

export type TripSheetState =
  | { mode: 'closed' }
  | { mode: 'create'; initial?: Partial<NewTrip> }
  | { mode: 'edit'; trip: TripRow };

interface Props {
  state: TripSheetState;
  onClose: () => void;
}

export function TripSheet({ state, onClose }: Props) {
  const visible = state.mode !== 'closed';
  const editing = state.mode === 'edit' ? state.trip : null;

  const addTrip = useTripsStore((s) => s.addTrip);
  const editTrip = useTripsStore((s) => s.editTrip);
  const removeTrip = useTripsStore((s) => s.removeTrip);
  const restoreTrip = useTripsStore((s) => s.restoreTrip);
  const tripsLastOdo = useTripsStore((s) => s.lastOdoKm);
  const lastKmTo = useTripsStore((s) => s.lastKmTo);
  const lastFareTo = useTripsStore((s) => s.lastFareTo);
  const recentPlaces = useTripsStore((s) => s.recentPlaces);
  const fills = useFuelStore((s) => s.fills);
  const capL = useFuelStore((s) => s.capL);
  const fuelLastOdo = useFuelStore((s) => s.lastOdoKm);
  const showToast = useToastStore((s) => s.show);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [km, setKm] = useState('');
  const [fare, setFare] = useState('');
  const [extras, setExtras] = useState('');
  const [odoFrom, setOdoFrom] = useState('');
  const [odoTo, setOdoTo] = useState('');
  const [fuelOverride, setFuelOverride] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pré-remplissage à chaque ouverture.
  useEffect(() => {
    if (!visible) return;
    const initial = state.mode === 'create' ? (state.initial ?? {}) : {};
    const base = editing ?? initial;
    const toPlace = (base as Partial<NewTrip>).toPlace ?? '';
    const knownKm = toPlace ? lastKmTo(toPlace) : null;
    const lastOdo = Math.max(tripsLastOdo ?? -1, fuelLastOdo ?? -1);
    setFrom((base as Partial<NewTrip>).fromPlace ?? '');
    setTo(toPlace);
    setKm(
      (base as Partial<NewTrip>).km != null
        ? String((base as Partial<NewTrip>).km)
        : knownKm != null
          ? String(knownKm)
          : '',
    );
    setFare((base as Partial<NewTrip>).fare != null ? String((base as Partial<NewTrip>).fare) : '');
    setExtras(
      (base as Partial<NewTrip>).extras != null && (base as Partial<NewTrip>).extras !== 0
        ? String((base as Partial<NewTrip>).extras)
        : '',
    );
    setOdoFrom(
      (base as Partial<NewTrip>).odoFromKm != null
        ? String((base as Partial<NewTrip>).odoFromKm)
        : lastOdo >= 0
          ? String(lastOdo)
          : '',
    );
    setOdoTo((base as Partial<NewTrip>).odoToKm != null ? String((base as Partial<NewTrip>).odoToKm) : '');
    setFuelOverride(
      (base as Partial<NewTrip>).fuelL != null ? String((base as Partial<NewTrip>).fuelL) : '',
    );
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Quand la destination change, propose le kilométrage habituel.
  const pickPlace = (place: string) => {
    setTo(place);
    const knownKm = lastKmTo(place);
    if (knownKm != null) setKm(String(knownKm));
  };

  const replay = useMemo(
    () =>
      replayFills(
        capL,
        fills.map((f) => ({
          volumeL: f.volumeL,
          pricePerLitre: f.pricePerLitre,
          feeFBu: f.feeFBu,
          litresBeforeL: f.litresBeforeL,
          litresAfterL: f.litresAfterL,
          odometerKm: f.odoKm,
          ts: f.ts,
        })),
      ),
    [capL, fills],
  );
  const blend = blendedPrice(replay.tank);
  const overall = replay.overallKmPerLitre;

  const preview = useMemo(() => {
    const kmNum = parseFrNumber(km);
    const fareNum = parseFrNumber(fare);
    const extrasNum = extras.trim() === '' ? 0 : parseFrNumber(extras);
    if (!Number.isFinite(kmNum) || kmNum <= 0) return null;
    if (!Number.isFinite(fareNum) || fareNum < 0) return null;
    if (!Number.isFinite(extrasNum) || extrasNum < 0) return null;
    const manualFuel = fuelOverride.trim() === '' ? null : parseFrNumber(fuelOverride);
    let fuelL: number | null = null;
    if (manualFuel != null && Number.isFinite(manualFuel) && manualFuel >= 0) {
      fuelL = manualFuel;
    } else if (overall != null && overall > 0) {
      fuelL = kmNum / overall;
    }
    const cost = fuelL != null && blend != null ? fuelL * blend : null;
    const profit = cost != null ? fareNum + extrasNum - cost : null;
    return { kmNum, fareNum, fuelL, cost, profit };
  }, [km, fare, extras, fuelOverride, overall, blend]);

  const save = () => {
    const kmNum = parseFrNumber(km);
    const fareNum = parseFrNumber(fare);
    const extrasNum = extras.trim() === '' ? 0 : parseFrNumber(extras);
    if (to.trim() === '') {
      setError(fr.trips.errTo);
      return;
    }
    if (!Number.isFinite(kmNum) || kmNum <= 0) {
      setError(fr.trips.errKm);
      return;
    }
    if (!Number.isFinite(fareNum) || fareNum < 0 || !Number.isFinite(extrasNum) || extrasNum < 0) {
      setError(fr.trips.errFare);
      return;
    }
    const odoFromNum = odoFrom.trim() === '' ? null : parseFrNumber(odoFrom);
    const odoToNum = odoTo.trim() === '' ? null : parseFrNumber(odoTo);
    if (
      (odoFromNum !== null && (!Number.isFinite(odoFromNum) || odoFromNum < 0)) ||
      (odoToNum !== null && (!Number.isFinite(odoToNum) || odoToNum < 0))
    ) {
      setError(fr.trips.errOdo);
      return;
    }
    const manualFuel = fuelOverride.trim() === '' ? null : parseFrNumber(fuelOverride);
    const input: NewTrip = {
      ts: editing ? editing.ts : Date.now(),
      fromPlace: from.trim() === '' ? null : from.trim(),
      toPlace: to.trim(),
      km: kmNum,
      fare: fareNum,
      extras: extrasNum,
      odoFromKm: odoFromNum,
      odoToKm: odoToNum,
      fuelL:
        manualFuel != null && Number.isFinite(manualFuel) && manualFuel >= 0 ? manualFuel : null,
      note: null,
    };
    const done = () => {
      showToast(fr.toast.tripSaved);
      onClose();
    };
    const failed = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
    if (editing) {
      void editTrip(editing.id, input).then(done, failed);
    } else {
      void addTrip(input).then(done, failed);
    }
  };

  const inputClass =
    'rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white';
  const labelClass = 'font-500 text-sm text-black dark:text-white';
  const placeholder = isDark ? '#737373' : '#A3A3A3';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[92%] rounded-t-3xl bg-white dark:bg-neutral-900">
          <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
            <Text className="font-700 text-xl text-black dark:text-white">
              {editing ? fr.trips.editTrip : fr.trips.newTrip}
            </Text>

            {recentPlaces.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {recentPlaces.map((place) => (
                  <Pressable
                    key={place}
                    accessibilityRole="button"
                    accessibilityLabel={place}
                    onPress={() => pickPlace(place)}
                    className="rounded-full bg-neutral-200 px-3 py-1 dark:bg-neutral-700"
                  >
                    <Text className="font-400 text-sm text-black dark:text-white">{place}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={{ gap: 4 }}>
              <Text className={labelClass}>{fr.trips.from}</Text>
              <TextInput
                value={from}
                onChangeText={setFrom}
                placeholder={fr.trips.fromPlaceholder}
                placeholderTextColor={placeholder}
                className={inputClass}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text className={labelClass}>{fr.trips.to}</Text>
              <TextInput
                value={to}
                onChangeText={setTo}
                placeholder={fr.trips.toPlaceholder}
                placeholderTextColor={placeholder}
                className={inputClass}
              />
            </View>

            <View className="flex-row gap-3">
              <View style={{ gap: 4, flex: 1 }}>
                <Text className={labelClass}>{fr.trips.km}</Text>
                <TextInput
                  value={km}
                  onChangeText={setKm}
                  keyboardType="decimal-pad"
                  placeholder="18"
                  placeholderTextColor={placeholder}
                  className={inputClass}
                />
              </View>
              <View style={{ gap: 4, flex: 1 }}>
                <Text className={labelClass}>{fr.trips.fare}</Text>
                <TextInput
                  value={fare}
                  onChangeText={setFare}
                  keyboardType="decimal-pad"
                  placeholder="8100"
                  placeholderTextColor={placeholder}
                  className={inputClass}
                />
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text className={labelClass}>{fr.trips.extras}</Text>
              <TextInput
                value={extras}
                onChangeText={setExtras}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={placeholder}
                className={inputClass}
              />
            </View>

            <View className="flex-row gap-3">
              <View style={{ gap: 4, flex: 1 }}>
                <Text className={labelClass}>{fr.trips.odoFrom}</Text>
                <TextInput
                  value={odoFrom}
                  onChangeText={setOdoFrom}
                  keyboardType="numeric"
                  placeholderTextColor={placeholder}
                  className={inputClass}
                />
              </View>
              <View style={{ gap: 4, flex: 1 }}>
                <Text className={labelClass}>{fr.trips.odoTo}</Text>
                <TextInput
                  value={odoTo}
                  onChangeText={setOdoTo}
                  keyboardType="numeric"
                  placeholderTextColor={placeholder}
                  className={inputClass}
                />
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text className={labelClass}>{fr.trips.fuelOverride}</Text>
              <TextInput
                value={fuelOverride}
                onChangeText={setFuelOverride}
                keyboardType="decimal-pad"
                placeholderTextColor={placeholder}
                className={inputClass}
              />
              <Text className="font-400 text-xs text-neutral-500 dark:text-neutral-400">
                {fr.trips.fuelOverrideHint}
                {overall != null ? ` (${formatKmPerLitre(overall)})` : ''}
              </Text>
            </View>

            {preview ? (
              <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                {formatKm(preview.kmNum)}.{' '}
                {preview.fuelL != null && preview.cost != null
                  ? `Carburant ≈ ${formatLitres(preview.fuelL)} (${formatFBu(preview.cost)}). Profit ≈ ${formatFBu(preview.profit ?? 0)}.`
                  : `Recette ${formatFBu(preview.fareNum)}.`}
                {to.trim() !== '' && lastFareTo(to) != null
                  ? ` ${fr.trips.usualFare} : ${formatFBu(lastFareTo(to) as number)}.`
                  : ''}
              </Text>
            ) : null}

            {error ? (
              <Text style={{ color: '#E53935' }} className="font-500 text-sm">
                {error}
              </Text>
            ) : null}

            <View className="flex-row gap-3">
              <SecondaryButton label={fr.trips.cancel} onPress={onClose} />
              <PrimaryButton label={fr.trips.save} onPress={save} />
            </View>

            {editing ? (
              <View className="flex-row gap-3">
                <SecondaryButton
                  label={fr.trips.duplicate}
                  onPress={() => {
                    const { id: _dropped, ...rest } = editing;
                    void _dropped;
                    void addTrip({ ...rest, ts: Date.now() }).then(() => {
                      showToast(fr.toast.tripSaved);
                      onClose();
                    });
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={fr.trips.deleteTripHint}
                  onPress={() =>
                    Alert.alert(
                      fr.trips.deleteTitle,
                      `${editing.fromPlace ? `${editing.fromPlace} → ` : ''}${editing.toPlace} · ${formatKm(editing.km)}`,
                      [
                        { text: fr.trips.cancel, style: 'cancel' },
                        {
                          text: fr.trips.deleteConfirm,
                          style: 'destructive',
                          onPress: () => {
                            void removeTrip(editing.id).then((snapshot) => {
                              if (snapshot) {
                                showToast(fr.toast.tripDeleted, {
                                  label: fr.toast.undo,
                                  onPress: () => void restoreTrip(snapshot),
                                });
                              }
                              onClose();
                            });
                          },
                        },
                      ],
                    )
                  }
                  className="flex-1 items-center rounded-full px-4 py-3"
                >
                  <Text style={{ color: '#E53935' }} className="font-500 text-base">
                    {fr.trips.delete}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
