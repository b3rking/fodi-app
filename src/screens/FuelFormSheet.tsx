import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { litresFromLevel, type TankLevel } from '../core/fuel/engine';
import { brandAction } from '../core/theme';
import { formatFBu, formatLitres, formatPricePerLitre } from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { fr } from '../i18n/fr';

const LEVELS: TankLevel[] = ['empty', 'quarter', 'half', 'threeQuarter', 'full'];

function parseFrNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

interface Props {
  visible: boolean;
  capL: number;
  litresBeforeDefault: number;
  hasHistory: boolean;
  onClose: () => void;
}

export function FuelFormSheet({ visible, capL, litresBeforeDefault, hasHistory, onClose }: Props) {
  const addFill = useFuelStore((s) => s.addFill);
  const lastOdoKm = useFuelStore((s) => s.lastOdoKm);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [litres, setLitres] = useState('');
  const [price, setPrice] = useState('');
  const [station, setStation] = useState('');
  const [odo, setOdo] = useState('');
  const [levelAfter, setLevelAfter] = useState<TankLevel>('full');
  const [levelBefore, setLevelBefore] = useState<TankLevel>('empty');
  const [error, setError] = useState<string | null>(null);

  // Réinitialise à chaque ouverture.
  useEffect(() => {
    if (visible) {
      setLitres('');
      setPrice('');
      setStation('');
      setOdo(lastOdoKm != null ? String(lastOdoKm) : '');
      setLevelAfter('full');
      setLevelBefore('empty');
      setError(null);
    }
  }, [visible, lastOdoKm]);

  const beforeL = hasHistory ? litresBeforeDefault : litresFromLevel(levelBefore, capL);
  const afterL = litresFromLevel(levelAfter, capL);

  const preview = useMemo(() => {
    const volume = parseFrNumber(litres);
    const priceL = parseFrNumber(price);
    if (!Number.isFinite(volume) || volume <= 0 || !Number.isFinite(priceL) || priceL <= 0) {
      return null;
    }
    return { volume, priceL, total: volume * priceL, after: beforeL + volume };
  }, [litres, price, beforeL]);

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
      litresAfterL: afterL,
    }).then(onClose, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
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

          {hasHistory ? null : (
            <View style={{ gap: 6 }}>
              <Text className={labelClass}>{fr.fuel.levelBefore}</Text>
              <LevelButtons value={levelBefore} onPick={setLevelBefore} />
            </View>
          )}

          <View style={{ gap: 6 }}>
            <Text className={labelClass}>{fr.fuel.levelAfter}</Text>
            <LevelButtons value={levelAfter} onPick={setLevelAfter} />
          </View>

          {preview ? (
            <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
              {formatLitres(preview.volume)} à {formatPricePerLitre(preview.priceL)} ={' '}
              {formatFBu(preview.total)} → réservoir {formatLitres(preview.after)}/
              {formatLitres(capL)}.
            </Text>
          ) : null}

          {error ? (
            <Text style={{ color: '#E53935' }} className="font-500 text-sm">
              {error}
            </Text>
          ) : null}

          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.fuel.cancel}
              onPress={onClose}
              className="flex-1 items-center rounded-full bg-neutral-200 px-4 py-3 dark:bg-neutral-700"
            >
              <Text className="font-500 text-base text-black dark:text-white">
                {fr.fuel.cancel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.fuel.save}
              onPress={save}
              className="flex-1 items-center rounded-full px-4 py-3"
              style={{ backgroundColor: brandAction }}
            >
              <Text className="font-500 text-base text-white">{fr.fuel.save}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LevelButtons({
  value,
  onPick,
}: {
  value: TankLevel;
  onPick: (l: TankLevel) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {LEVELS.map((level) => {
        const selected = level === value;
        return (
          <Pressable
            // Même raison que le sélecteur de thème : remontage propre au
            // changement de sélection (classes finales dès le premier rendu).
            key={`${level}-${selected ? 'on' : 'off'}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${fr.fuel.levels[level]}`}
            onPress={() => onPick(level)}
            className={
              selected
                ? 'flex-1 items-center rounded-xl px-2 py-2'
                : 'flex-1 items-center rounded-xl bg-neutral-200 px-2 py-2 dark:bg-neutral-700'
            }
            style={selected ? { backgroundColor: brandAction } : undefined}
          >
            <Text
              className={
                selected
                  ? 'font-500 text-sm text-white'
                  : 'font-400 text-sm text-black dark:text-white'
              }
            >
              {fr.fuel.levels[level]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
