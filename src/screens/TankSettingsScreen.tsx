import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { replayFills, totalLitres, validateTankLevels, type LevelLabelStyle, type TankLevelDef } from '../core/fuel/engine';
import { brandAction } from '../core/theme';
import type { FuelGaugeStyle } from '../db/database';
import { formatLitres } from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { useToastStore } from '../store/toastStore';
import { IconButton, PrimaryButton } from '../components/buttons';
import { LevelsEditor } from '../components/LevelsEditor';
import { fr } from '../i18n/fr';

/** Module Réservoir : capacité + niveaux, un seul bouton Enregistrer. */
export function TankSettingsScreen() {
  const router = useRouter();
  const capL = useFuelStore((s) => s.capL);
  const fills = useFuelStore((s) => s.fills);
  const storedLevels = useFuelStore((s) => s.levels);
  const storedGauge = useFuelStore((s) => s.gauge);
  const storedFormat = useFuelStore((s) => s.levelFormat);
  const setCapL = useFuelStore((s) => s.setCapL);
  const setLevels = useFuelStore((s) => s.setLevels);
  const setGauge = useFuelStore((s) => s.setGauge);
  const setLevelFormat = useFuelStore((s) => s.setLevelFormat);
  const showToast = useToastStore((s) => s.show);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [capStr, setCapStr] = useState(String(capL));
  const [levels, setLevelsDraft] = useState<TankLevelDef[]>(storedLevels);
  const [gauge, setGaugeDraft] = useState<FuelGaugeStyle>(storedGauge);
  const [format, setFormatDraft] = useState<LevelLabelStyle>(storedFormat);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCapStr(String(capL));
    setLevelsDraft(storedLevels);
    setGaugeDraft(storedGauge);
    setFormatDraft(storedFormat);
  }, [capL, storedLevels, storedGauge, storedFormat]);

  const currentLitres = useMemo(
    () =>
      totalLitres(
        replayFills(
          capL,
          fills.map((f) => ({
            volumeL: f.volumeL,
            pricePerLitre: f.pricePerLitre,
            feeFBu: f.feeFBu,
            litresBeforeL: f.litresBeforeL,
            litresAfterL: f.litresAfterL,
            odometerKm: f.odoKm,
          })),
        ).tank,
      ),
    [capL, fills],
  );

  const fail = (msg: string) => {
    setMessage(msg);
    setIsError(true);
  };

  const save = () => {
    if (saving) return;
    const parsed = Number(capStr.trim().replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 5 || parsed > 500) {
      fail(fr.settings.errCapRange);
      return;
    }
    if (parsed + 1e-9 < currentLitres) {
      fail(`${fr.settings.errCapTooSmall} (${formatLitres(currentLitres)}).`);
      return;
    }
    const levelsProblem = validateTankLevels(levels);
    if (levelsProblem) {
      fail(levelsProblem);
      return;
    }
    setSaving(true);
    setMessage(null);
    void Promise.all([setCapL(parsed), setLevels(levels), setGauge(gauge), setLevelFormat(format)]).then(
      () => {
        setSaving(false);
        setIsError(false);
        showToast(fr.toast.settingsSaved);
        router.back();
      },
      (e: unknown) => {
        setSaving(false);
        fail(e instanceof Error ? e.message : String(e));
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View className="flex-row items-center gap-3">
        <IconButton label={fr.settings.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={isDark ? '#FFFFFF' : '#000000'} />
        </IconButton>
        <Text className="font-700 text-3xl text-black dark:text-white">
          {fr.settings.tankTitle}
        </Text>
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.settings.tankCapacity}
        </Text>
        <TextInput
          value={capStr}
          onChangeText={(v) => {
            setCapStr(v);
            setMessage(null);
          }}
          keyboardType="decimal-pad"
          placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
          className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
        />
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.settings.tankHint}
        </Text>
      </View>

      <View className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <LevelsEditor levels={levels} format={format} onChange={setLevelsDraft} />
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.settings.formatTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.settings.formatHint}
        </Text>
        <OptionPicker
          options={FORMAT_OPTIONS}
          value={format}
          onPick={setFormatDraft}
          labels={fr.settings.formatOptions}
        />
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.settings.gaugeTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.settings.gaugeHint}
        </Text>
        <OptionPicker
          options={GAUGE_OPTIONS}
          value={gauge}
          onPick={setGaugeDraft}
          labels={fr.settings.gaugeOptions}
        />
      </View>

      {message ? (
        <Text style={{ color: isError ? '#E53935' : '#2E7D32' }} className="font-500 text-sm">
          {message}
        </Text>
      ) : null}

      <PrimaryButton
        label={saving ? fr.settings.saving : fr.settings.save}
        onPress={save}
        disabled={saving}
        loading={saving}
      />
    </ScrollView>
  );
}

const GAUGE_OPTIONS: FuelGaugeStyle[] = ['bars', 'needle', 'litres'];
const FORMAT_OPTIONS: LevelLabelStyle[] = ['fractions', 'percent'];

function OptionPicker<T extends string>({
  options,
  value,
  onPick,
  labels,
}: {
  options: T[];
  value: T;
  onPick: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            // Remontage propre au changement (cf. ThemeSwitcher).
            key={`${option}-${selected ? 'on' : 'off'}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={labels[option]}
            onPress={() => onPick(option)}
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
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
