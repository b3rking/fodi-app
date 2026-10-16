import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronRight, Fuel } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { isLockEnabled, hasPinSet, enableLock, disableLock, setupPin, getLockTimeoutMs, setLockTimeoutMs, setCurrentTimeout } from '../core/lock';
import { IconButton } from '../components/buttons';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { fr } from '../i18n/fr';

const ACCENT_PRESETS = ['#FF9800', '#FF5722', '#2E7D32', '#1E88E5', '#8E24AA', '#E53935'];

/** Paramètres : menu des modules (un écran de réglages par module). */
export function SettingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#FFFFFF' : '#000000';
  const [lockEnabled, setLockEnabled] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [pinSetup, setPinSetup] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [timeoutMin, setTimeoutMin] = useState('5');

  useEffect(() => {
    void isLockEnabled().then(setLockEnabled);
    void hasPinSet().then(setPinSet);
    void getLockTimeoutMs().then((ms) => {
      setCurrentTimeout(ms);
      setTimeoutMin(String(Math.round(ms / 60000)));
    });
  }, []);

  const showToast = useToastStore((s) => s.show);

  const toggleLock = () => {
    if (lockEnabled) {
      void disableLock().then(() => setLockEnabled(false));
    } else {
      void enableLock().then(() => {
        setLockEnabled(true);
        if (!pinSet) setPinSetup(true);
      });
    }
  };

  const savePin = async () => {
    if (pin1.length !== 4) {
      setPinError(fr.lock.pinLength);
      return;
    }
    if (pin1 !== pin2) {
      setPinError(fr.lock.pinMismatch);
      return;
    }
    try {
      await setupPin(pin1);
      setPinSet(true);
      setPinSetup(false);
      setPin1('');
      setPin2('');
      setPinError(null);
      showToast(fr.toast.settingsSaved);
    } catch (e) {
      setPinError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View className="flex-row items-center gap-3">
        <IconButton label={fr.settings.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={iconColor} />
        </IconButton>
        <Text className="font-700 text-3xl text-black dark:text-white">
          {fr.settings.title}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fr.settings.tankMenuTitle}
        onPress={() => router.push('/settings/tank' as '/')}
        className="flex-row items-center gap-3 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800"
      >
        <Fuel size={24} color={iconColor} />
        <View className="flex-1 gap-0">
          <Text className="font-500 text-base text-black dark:text-white">
            {fr.settings.tankMenuTitle}
          </Text>
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.settings.tankMenuDesc}
          </Text>
        </View>
        <ChevronRight size={20} color={iconColor} />
      </Pressable>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.themeTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.themeDescription}
        </Text>
        <ThemeSwitcher />
        <Text className="font-500 mt-2 text-base text-black dark:text-white">
          {fr.accentTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.accentHint}
        </Text>
        <AccentPicker />
      </View>

      {lockEnabled ? (
        <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <Text className="font-500 text-base text-black dark:text-white">
            {fr.lock.autoLock}
          </Text>
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.lock.autoLockHint}
          </Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              value={timeoutMin}
              onChangeText={(v) => {
                setTimeoutMin(v.replace(/\D/g, '').slice(0, 2));
              }}
              keyboardType="numeric"
              maxLength={2}
              className="w-20 rounded-xl border border-neutral-300 px-3 py-2 text-center font-400 text-base text-black dark:border-neutral-600 dark:text-white"
            />
            <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
              {fr.lock.minutes}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.lock.autoLock}
              onPress={() => {
                const min = Math.max(1, Math.min(120, Number(timeoutMin) || 5));
                void setLockTimeoutMs(min * 60000).then(() => {
                  setCurrentTimeout(min * 60000);
                  showToast(fr.toast.settingsSaved);
                });
              }}
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: '#FF9800' }}
            >
              <Text className="font-500 text-sm text-white">{fr.settings.save}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {pinSetup ? (
        <View className="gap-3 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <Text className="font-500 text-base text-black dark:text-white">
            {fr.lock.setupTitle}
          </Text>
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {fr.lock.setupHint}
          </Text>
          <TextInput
            value={pin1}
            onChangeText={(v) => {
              setPin1(v.replace(/\D/g, '').slice(0, 4));
              setPinError(null);
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="••••"
            secureTextEntry
            className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
          />
          <TextInput
            value={pin2}
            onChangeText={(v) => {
              setPin2(v.replace(/\D/g, '').slice(0, 4));
              setPinError(null);
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="••••"
            secureTextEntry
            className="rounded-xl border border-neutral-300 px-3 py-2 font-400 text-base text-black dark:border-neutral-600 dark:text-white"
          />
          {pinError ? (
            <Text style={{ color: '#E53935' }} className="font-500 text-sm">
              {pinError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fr.lock.savePin}
            onPress={() => void savePin()}
            className="items-center rounded-full px-4 py-3"
            style={{ backgroundColor: '#FF9800' }}
          >
            <Text className="font-500 text-base text-white">{fr.lock.savePin}</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <View style={{ gap: 2, flex: 1 }}>
          <Text className="font-500 text-base text-black dark:text-white">
            {fr.lock.unlockTitle}
          </Text>
          <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
            {lockEnabled
              ? pinSet
                ? fr.lock.changeTitle
                : fr.lock.setupHint
              : fr.lock.disable}
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={fr.lock.unlockTitle}
          accessibilityState={{ checked: lockEnabled }}
          onPress={toggleLock}
          className="h-7 w-12 rounded-full p-1"
          style={{ backgroundColor: lockEnabled ? '#FF9800' : '#BDBDBD' }}
        >
          <View
            className="h-5 w-5 rounded-full bg-white shadow"
            style={{ alignSelf: lockEnabled ? 'flex-end' : 'flex-start' }}
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function AccentPicker() {
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);
  const showToast = useToastStore((s) => s.show);

  const apply = (color: string) => {
    void setAccent(color).then(() => showToast(fr.toast.settingsSaved));
  };

  return (
    <View className="flex-row gap-2">
      {ACCENT_PRESETS.map((color) => {
        const selected = accent.toUpperCase() === color;
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={color}
            accessibilityState={{ selected }}
            onPress={() => apply(color)}
            className="h-10 flex-1 items-center justify-center rounded-full"
            style={{
              backgroundColor: color,
              borderWidth: selected ? 3 : 0,
              borderColor: '#FFFFFF',
            }}
          >
            {selected ? <Check size={18} color="#FFFFFF" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
