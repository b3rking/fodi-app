import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '../store/themeStore';
import { fr } from '../i18n/fr';
import { verifyPin, isLockEnabled, hasPinSet, setupPin, disableLock, enableLock, changePin } from '../core/lock';

interface Props {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: Props) {
  const { colorScheme } = useColorScheme();
  const accent = useThemeStore((s) => s.accent);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'unlock' | 'setup' | 'change'>('unlock');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    void isLockEnabled().then((enabled) => {
      if (!enabled) {
        onUnlock();
        return;
      }
      void hasPinSet().then((has) => {
        if (!has) setMode('setup');
      });
    });
  }, [onUnlock]);

  const tryUnlock = async () => {
    if (pin.length !== 4) return;
    const valid = await verifyPin(pin);
    if (valid) {
      setError(null);
      onUnlock();
    } else {
      setError(fr.lock.wrongPin);
      setPin('');
    }
  };

  const handleSetup = async () => {
    if (newPin.length !== 4) {
      setError(fr.lock.pinLength);
      return;
    }
    if (newPin !== confirmPin) {
      setError(fr.lock.pinMismatch);
      return;
    }
    try {
      await setupPin(newPin);
      setError(null);
      onUnlock();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleChange = async () => {
    if (newPin.length !== 4) {
      setError(fr.lock.pinLength);
      return;
    }
    if (newPin !== confirmPin) {
      setError(fr.lock.pinMismatch);
      return;
    }
    try {
      await changePin(oldPin, newPin);
      setError(null);
      setMode('unlock');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDisable = async () => {
    await disableLock();
    onUnlock();
  };

  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1 items-center justify-center gap-6 px-8">
      <Text className="font-700 text-2xl text-black dark:text-white">
        {mode === 'setup' ? fr.lock.setupTitle : mode === 'change' ? fr.lock.changeTitle : fr.lock.unlockTitle}
      </Text>

      {mode === 'setup' ? (
        <View className="w-full gap-4">
          <Text className="font-400 text-center text-sm text-neutral-600 dark:text-neutral-300">
            {fr.lock.setupHint}
          </Text>
          <PinInput value={newPin} onChange={setNewPin} isDark={isDark} />
          <PinInput value={confirmPin} onChange={setConfirmPin} isDark={isDark} />
          {error ? <ErrorText message={error} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fr.lock.savePin}
            onPress={handleSetup}
            className="items-center rounded-full px-4 py-3"
            style={{ backgroundColor: accent }}
          >
            <Text className="font-500 text-base text-white">{fr.lock.savePin}</Text>
          </Pressable>
        </View>
      ) : mode === 'change' ? (
        <View className="w-full gap-4">
          <PinInput value={oldPin} onChange={setOldPin} isDark={isDark} />
          <PinInput value={newPin} onChange={setNewPin} isDark={isDark} />
          <PinInput value={confirmPin} onChange={setConfirmPin} isDark={isDark} />
          {error ? <ErrorText message={error} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fr.lock.savePin}
            onPress={handleChange}
            className="items-center rounded-full px-4 py-3"
            style={{ backgroundColor: accent }}
          >
            <Text className="font-500 text-base text-white">{fr.lock.savePin}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="w-full gap-4">
          <PinInput value={pin} onChange={setPin} isDark={isDark} onComplete={tryUnlock} />
          {error ? <ErrorText message={error} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fr.lock.forgotPin}
            onPress={() => {}}
            className="items-center"
          >
            <Text className="font-400 text-sm text-neutral-500 dark:text-neutral-400">
              {fr.lock.forgotPin}
            </Text>
          </Pressable>
        </View>
      )}

      {mode === 'unlock' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.lock.disable}
          onPress={handleDisable}
          className="items-center"
        >
          <Text className="font-400 text-sm text-neutral-500 dark:text-neutral-400">
            {fr.lock.disable}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PinInput({
  value,
  onChange,
  isDark,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  onComplete?: () => void;
}) {
  return (
    <View className="flex-row justify-center gap-3">
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          className="h-14 w-14 items-center justify-center rounded-2xl border-2"
          style={{
            borderColor: value.length > i ? '#FF9800' : isDark ? '#404040' : '#D0D0D0',
            backgroundColor: value.length > i ? '#FF980022' : 'transparent',
          }}
        >
          <Text className="font-700 text-xl text-black dark:text-white">
            {value[i] ? '●' : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <Text style={{ color: '#E53935' }} className="font-500 text-center text-sm">
      {message}
    </Text>
  );
}
