import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { IconButton } from '../components/buttons';
import { fr } from '../i18n/fr';
import {
  isLockEnabled,
  hasPinSet,
  enableLock,
  disableLock,
  setupPin,
  getLockTimeoutMs,
  setLockTimeoutMs,
  setCurrentTimeout,
} from '../core/lock';

/** Réglages de sécurité : verrou PIN + verrouillage automatique. */
export function SecuritySettingsScreen() {
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
  const [timeoutValue, setTimeoutValue] = useState('5');
  const [timeoutUnit, setTimeoutUnit] = useState<'min' | 'sec'>('min');

  useEffect(() => {
    void isLockEnabled().then(setLockEnabled);
    void hasPinSet().then(setPinSet);
    void getLockTimeoutMs().then((ms) => {
      setCurrentTimeout(ms);
      if (ms < 60000 || ms % 60000 !== 0) {
        setTimeoutUnit('sec');
        setTimeoutValue(String(Math.round(ms / 1000)));
      } else {
        setTimeoutUnit('min');
        setTimeoutValue(String(Math.round(ms / 60000)));
      }
    });
  }, []);

  const showToast = useToastStore((s) => s.show);
  const accent = useThemeStore((s) => s.accent);

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
          {fr.settings.securityMenuTitle}
        </Text>
      </View>

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
          style={{ backgroundColor: lockEnabled ? accent : '#BDBDBD' }}
        >
          <View
            className="h-5 w-5 rounded-full bg-white shadow"
            style={{ alignSelf: lockEnabled ? 'flex-end' : 'flex-start' }}
          />
        </Pressable>
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
              value={timeoutValue}
              onChangeText={(v) => {
                setTimeoutValue(v.replace(/\D/g, '').slice(0, 3));
              }}
              keyboardType="numeric"
              maxLength={3}
              className="w-20 rounded-xl border border-neutral-300 px-3 py-2 text-center font-400 text-base text-black dark:border-neutral-600 dark:text-white"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.lock.minutes}
              onPress={() => setTimeoutUnit('min')}
              className="flex-1 items-center rounded-full px-3 py-2"
              style={{ backgroundColor: timeoutUnit === 'min' ? accent : '#BDBDBD' }}
            >
              <Text className="font-500 text-sm text-white">{fr.lock.minutes}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.lock.seconds}
              onPress={() => setTimeoutUnit('sec')}
              className="flex-1 items-center rounded-full px-3 py-2"
              style={{ backgroundColor: timeoutUnit === 'sec' ? accent : '#BDBDBD' }}
            >
              <Text className="font-500 text-sm text-white">{fr.lock.seconds}</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fr.lock.autoLock}
            onPress={() => {
              const n = Number(timeoutValue) || 0;
              const ms = timeoutUnit === 'sec' ? n * 1000 : n * 60000;
              const clamped = Math.max(10000, Math.min(120 * 60000, Math.round(ms)));
              if (!Number.isFinite(ms) || ms <= 0) return;
              void setLockTimeoutMs(clamped)
                .then(() => {
                  setCurrentTimeout(clamped);
                  // Reflète le clamp (ex. 5 s saisies → 10 s minimum).
                  if (timeoutUnit === 'sec') setTimeoutValue(String(Math.round(clamped / 1000)));
                  else setTimeoutValue(String(Math.round(clamped / 60000)));
                  showToast(fr.toast.settingsSaved);
                })
                .catch((e) => showToast(e instanceof Error ? e.message : String(e)));
            }}
            className="items-center rounded-full px-4 py-3"
            style={{ backgroundColor: accent }}
          >
            <Text className="font-500 text-base text-white">{fr.settings.save}</Text>
          </Pressable>
        </View>
      ) : null}

      {pinSetup || (lockEnabled && pinSet) ? (
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
            style={{ backgroundColor: accent }}
          >
            <Text className="font-500 text-base text-white">{fr.lock.savePin}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
