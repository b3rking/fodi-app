import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { replayFills, totalLitres } from '../core/fuel/engine';
import { brandAction } from '../core/theme';
import { formatLitres } from '../core/format';
import { useFuelStore } from '../store/fuelStore';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { fr } from '../i18n/fr';

export function SettingsScreen() {
  const router = useRouter();
  const capL = useFuelStore((s) => s.capL);
  const fills = useFuelStore((s) => s.fills);
  const setCapL = useFuelStore((s) => s.setCapL);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [capStr, setCapStr] = useState(String(capL));
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setCapStr(String(capL));
  }, [capL]);

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

  const save = () => {
    const parsed = Number(capStr.trim().replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 5 || parsed > 500) {
      setMessage(fr.settings.errCapRange);
      setIsError(true);
      return;
    }
    if (parsed + 1e-9 < currentLitres) {
      setMessage(`${fr.settings.errCapTooSmall} (${formatLitres(currentLitres)}).`);
      setIsError(true);
      return;
    }
    void setCapL(parsed).then(
      () => {
        setMessage(fr.settings.saved);
        setIsError(false);
      },
      (e: unknown) => {
        setMessage(e instanceof Error ? e.message : String(e));
        setIsError(true);
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.settings.back}
          onPress={() => router.back()}
          className="rounded-full bg-neutral-100 p-2 text-black dark:bg-neutral-800 dark:text-white"
        >
          <ArrowLeft size={22} color={isDark ? '#FFFFFF' : '#000000'} />
        </Pressable>
        <Text className="font-700 text-3xl text-black dark:text-white">
          {fr.settings.title}
        </Text>
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.settings.tankTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
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
        {message ? (
          <Text
            style={{ color: isError ? '#E53935' : '#2E7D32' }}
            className="font-500 text-sm"
          >
            {message}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.settings.save}
          onPress={save}
          className="items-center rounded-full px-4 py-3"
          style={{ backgroundColor: brandAction }}
        >
          <Text className="font-500 text-base text-white">{fr.settings.save}</Text>
        </Pressable>
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.themeTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.themeDescription}
        </Text>
        <ThemeSwitcher />
      </View>
    </ScrollView>
  );
}
