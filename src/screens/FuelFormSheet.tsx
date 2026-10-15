import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { litresFromFraction, formatCurrentLevel, formatLevelLabel, replayLiveTank, totalLitres, type LevelLabelStyle, type TankLevelDef } from '../core/fuel/engine';
import { formatFBu, formatLitres, formatPricePerLitre } from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { useTripsStore } from '../store/tripsStore';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { PrimaryButton, SecondaryButton } from '../components/buttons';
import { fr } from '../i18n/fr';

function parseFrNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

interface Props {
  visible: boolean;
  capL: number;
  onClose: () => void;
}

export function FuelFormSheet({ visible, capL, onClose }: Props) {
  const addFill = useFuelStore((s) => s.addFill);
  const lastOdoKm = useFuelStore((s) => s.lastOdoKm);
  const levels = useFuelStore((s) => s.levels);
  const levelFormat = useFuelStore((s) => s.levelFormat);
  const fills = useFuelStore((s) => s.fills);
  const trips = useTripsStore((s) => s.trips);
  const showToast = useToastStore((s) => s.show);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [litres, setLitres] = useState('');
  const [price, setPrice] = useState('');
  const [station, setStation] = useState('');
  const [odo, setOdo] = useState('');
  const [levelBeforeId, setLevelBeforeId] = useState('empty');
  const [error, setError] = useState<string | null>(null);

  const fractionOf = (id: string) => levels.find((l) => l.id === id)?.fraction ?? 0;

  // Niveau suivi par l'app (photos + trajets) : proposé par défaut,
  // ajustable si la réalité diffère.
  const liveLitres = useMemo(() => {
    const { tank } = replayLiveTank(
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
      trips.map((t) => ({ ts: t.ts, km: t.km, fuelL: t.fuelL })),
    );
    return totalLitres(tank);
  }, [capL, fills, trips]);

  const nearestLevelId = useMemo(() => {
    const frac = capL > 0 ? liveLitres / capL : 0;
    const sorted = [...levels].sort((a, b) => a.fraction - b.fraction);
    let best = sorted[0]?.id ?? 'empty';
    for (const level of sorted) {
      if (level.fraction - frac < 1e-9) best = level.id;
    }
    return best;
  }, [levels, liveLitres, capL]);

  // Réinitialise à chaque ouverture (niveau d'arrivée = suivi de l'app).
  useEffect(() => {
    if (visible) {
      setLitres('');
      setPrice('');
      setStation('');
      setOdo(lastOdoKm != null ? String(lastOdoKm) : '');
      setLevelBeforeId(nearestLevelId);
      setError(null);
    }
  }, [visible, lastOdoKm, levels, nearestLevelId]);
  // Niveau estimé en arrivant : c'est lui qui dit ce qui a brûlé depuis
  // la dernière fois (photo précédente − arrivée = consommation FIFO).
  const beforeL = litresFromFraction(fractionOf(levelBeforeId), capL);

  const preview = useMemo(() => {
    const volume = parseFrNumber(litres);
    const priceL = parseFrNumber(price);
    if (!Number.isFinite(volume) || volume <= 0 || !Number.isFinite(priceL) || priceL <= 0) {
      return null;
    }
    const after = beforeL + volume;
    return {
      volume,
      priceL,
      total: volume * priceL,
      after,
      afterLabel: formatCurrentLevel(levels, capL > 0 ? after / capL : 0, levelFormat),
    };
  }, [litres, price, beforeL, capL, levels, levelFormat]);

  const save = () => {
    const volume = parseFrNumber(litres);
    const priceL = parseFrNumber(price);
    if (!Number.isFinite(volume) || volume <= 0) {
      setError(fr.fuel.errVolume);
      return;
    }
    if (!Number.isFinite(priceL) || priceL <= 0) {
      setError(fr.fuel.errPrice);
      return;
    }
    const free = capL - beforeL;
    if (volume - free > 1e-9) {
      setError(`${fr.fuel.errOverflowPrefix}${formatLitres(Math.max(0, free))} maximum.`);
      return;
    }
    const odoNum = odo.trim() === '' ? null : parseFrNumber(odo);
    if (odoNum !== null && (!Number.isFinite(odoNum) || odoNum < 0)) {
      setError(fr.fuel.errOdo);
      return;
    }
    void addFill({
      station: station.trim() === '' ? null : station.trim(),
      volumeL: volume,
      pricePerLitre: priceL,
      odoKm: odoNum,
      litresBeforeL: beforeL,
      // Niveau après = calculé (avant + volume), pas estimé : une question en moins.
      litresAfterL: beforeL + volume,
    }).then(
      () => {
        showToast(fr.toast.fillSaved);
        onClose();
      },
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    );
  };

  const inputClass =
    'rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white';
  const labelClass = 'font-500 text-sm text-black dark:text-white';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="gap-3 rounded-t-3xl bg-white p-6 dark:bg-neutral-900">
          <Text className="font-700 text-xl text-black dark:text-white">
            {fr.fuel.sheetTitle}
          </Text>

          <View style={{ gap: 4 }}>
            <Text className={labelClass}>{fr.fuel.litres}</Text>
            <TextInput
              value={litres}
              onChangeText={setLitres}
              keyboardType="decimal-pad"
              placeholder="12"
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
              className={inputClass}
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text className={labelClass}>{fr.fuel.pricePerLitre}</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="3800"
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
              className={inputClass}
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text className={labelClass}>{fr.fuel.station}</Text>
            <TextInput
              value={station}
              onChangeText={setStation}
              placeholder={fr.fuel.stationPlaceholder}
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
              className={inputClass}
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text className={labelClass}>{fr.fuel.odometer}</Text>
            <TextInput
              value={odo}
              onChangeText={setOdo}
              keyboardType="numeric"
              placeholder="125430"
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
              className={inputClass}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text className={labelClass}>{fr.fuel.levelBefore}</Text>
            <LevelButtons levels={levels} format={levelFormat} value={levelBeforeId} onPick={setLevelBeforeId} />
            <Text className="font-400 text-xs text-neutral-500 dark:text-neutral-400">
              {fr.fuel.trackedPrefix} : {formatCurrentLevel(levels, capL > 0 ? liveLitres / capL : 0, levelFormat)} (≈{' '}
              {formatLitres(liveLitres)}).
            </Text>
          </View>

          {preview ? (
            <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
              {formatLitres(preview.volume)} à {formatPricePerLitre(preview.priceL)} ={' '}
              {formatFBu(preview.total)} → réservoir {formatLitres(preview.after)}/
              {formatLitres(capL)} ({preview.afterLabel}).
            </Text>
          ) : null}

          {error ? (
            <Text style={{ color: '#E53935' }} className="font-500 text-sm">
              {error}
            </Text>
          ) : null}

          <View className="flex-row gap-3">
            <SecondaryButton label={fr.fuel.cancel} onPress={onClose} />
            <PrimaryButton label={fr.fuel.save} onPress={save} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LevelButtons({
  levels,
  format,
  value,
  onPick,
}: {
  levels: TankLevelDef[];
  format: LevelLabelStyle;
  value: string;
  onPick: (id: string) => void;
}) {
  const accent = useThemeStore((s) => s.accent);
  return (
    <View className="flex-row flex-wrap gap-2">
      {levels.map((level) => {
        const selected = level.id === value;
        return (
          <Pressable
            // Même raison que le sélecteur de thème : remontage propre au
            // changement de sélection (classes finales dès le premier rendu).
            key={`${level.id}-${selected ? 'on' : 'off'}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={formatLevelLabel(level.fraction, format)}
            onPress={() => onPick(level.id)}
            className={
              selected
                ? 'items-center rounded-xl px-3 py-2'
                : 'items-center rounded-xl bg-neutral-200 px-3 py-2 dark:bg-neutral-700'
            }
            style={[selected ? { backgroundColor: accent } : undefined, { flexGrow: 1 }]}
          >
            <Text
              className={
                selected
                  ? 'font-500 text-sm text-white'
                  : 'font-400 text-sm text-black dark:text-white'
              }
            >
              {formatLevelLabel(level.fraction, format)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
