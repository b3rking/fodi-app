import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '../store/themeStore';
import { fr } from '../i18n/fr';
import { verifyPin, isLockEnabled, hasPinSet, setupPin, changePin } from '../core/lock';

interface Props {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: Props) {
  const { colorScheme } = useColorScheme();
  const accent = useThemeStore((s) => s.accent);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'unlock' | 'setup1' | 'setup2' | 'change1' | 'change2'>('unlock');
  const [firstPin, setFirstPin] = useState('');
  const [oldPin, setOldPin] = useState('');

  useEffect(() => {
    void isLockEnabled().then((enabled) => {
      if (!enabled) {
        onUnlock();
        return;
      }
      void hasPinSet().then((has) => {
        if (!has) setMode('setup1');
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

  const handleSetup1 = () => {
    if (pin.length !== 4) {
      setError(fr.lock.pinLength);
      return;
    }
    setFirstPin(pin);
    setPin('');
    setError(null);
    setMode('setup2');
  };

  const handleSetup2 = async () => {
    if (pin !== firstPin) {
      setError(fr.lock.pinMismatch);
      setPin('');
      setMode('setup1');
      setFirstPin('');
      return;
    }
    try {
      await setupPin(pin);
      setError(null);
      onUnlock();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleChange1 = async () => {
    if (pin.length !== 4) {
      setError(fr.lock.pinLength);
      return;
    }
    const valid = await verifyPin(pin);
    if (!valid) {
      setError(fr.lock.wrongPin);
      setPin('');
      return;
    }
    setOldPin(pin);
    setPin('');
    setError(null);
    setMode('change2');
  };

  const handleChange2 = async () => {
    if (pin !== firstPin) {
      setError(fr.lock.pinMismatch);
      setPin('');
      setMode('change1');
      setFirstPin('');
      return;
    }
    try {
      await changePin(oldPin, pin);
      setError(null);
      setMode('unlock');
      setOldPin('');
      setFirstPin('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const isDark = colorScheme === 'dark';

  const title =
    mode === 'setup1' || mode === 'setup2'
      ? fr.lock.setupTitle
      : mode === 'change1' || mode === 'change2'
        ? fr.lock.changeTitle
        : fr.lock.unlockTitle;

  const hint =
    mode === 'setup1'
      ? fr.lock.setupHint
      : mode === 'setup2'
        ? fr.lock.confirmHint
        : mode === 'change1'
          ? fr.lock.changeOldHint
          : mode === 'change2'
            ? fr.lock.confirmHint
            : null;

  const onSubmit =
    mode === 'unlock'
      ? tryUnlock
      : mode === 'setup1'
        ? handleSetup1
        : mode === 'setup2'
          ? () => void handleSetup2()
          : mode === 'change1'
            ? handleChange1
            : () => void handleChange2();

  const submitLabel =
    mode === 'setup1' || mode === 'change1'
      ? fr.lock.next
      : mode === 'setup2' || mode === 'change2'
        ? fr.lock.savePin
        : null;

  return (
    <View className="flex-1 items-center justify-center gap-6 px-8">
      <Text className="font-700 text-2xl text-black dark:text-white">{title}</Text>
      {hint ? (
        <Text className="font-400 text-center text-sm text-neutral-600 dark:text-neutral-300">
          {hint}
        </Text>
      ) : null}

      <View className="w-full gap-4">
        <PinInput value={pin} onChange={setPin} isDark={isDark} accent={accent} onComplete={onSubmit} />
        {error ? <ErrorText message={error} /> : null}
        {submitLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            onPress={onSubmit}
            className="items-center rounded-full px-4 py-3"
            style={{ backgroundColor: accent }}
          >
            <Text className="font-500 text-base text-white">{submitLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PinInput({
  value,
  onChange,
  isDark,
  accent,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  accent: string;
  onComplete?: () => void;
}) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (value.length === 4) {
      const timer = setTimeout(() => onCompleteRef.current?.(), 200);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '').slice(0, 4);
          onChange(digits);
        }}
        keyboardType="number-pad"
        maxLength={4}
        autoFocus
        caretHidden
        placeholder=""
        placeholderTextColor="transparent"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          padding: 0,
        }}
      />
      <View pointerEvents="none" className="flex-row justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className="h-14 w-14 items-center justify-center rounded-2xl border-2"
            style={{
              borderColor: value.length > i ? accent : isDark ? '#404040' : '#D0D0D0',
              backgroundColor: value.length > i ? `${accent}22` : 'transparent',
            }}
          >
            <Text className="font-700 text-xl text-black dark:text-white">
              {value[i] ? '●' : ''}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <Text style={{ color: '#E53935' }} className="font-500 text-center text-sm">
      {message}
    </Text>
  );
}
