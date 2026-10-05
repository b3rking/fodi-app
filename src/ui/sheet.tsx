import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from './ThemeProvider';

/**
 * Une feuille qui monte du bas.
 *
 * Les nouvelles données se saisissent dans une feuille, jamais sur un nouvel
 * écran. Cette règle garde l'application à cinq onglets : si saisir un trajet
 * exigeait son propre écran, on serait à six.
 */
export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-scrim">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fermer" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="max-h-[92%] rounded-t-3xl border-t border-line bg-bg"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="items-center pt-2">
              <View className="h-1 w-10 rounded-full bg-line" />
            </View>

            <View className="flex-row items-start justify-between px-4 pb-4 pt-3">
              <View className="flex-1 pr-3">
                <Text className="text-title font-bold text-ink">{title}</Text>
                {subtitle && <Text className="mt-0.5 text-small text-ink-muted">{subtitle}</Text>}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                className="rounded-full bg-surface-alt p-2 active:opacity-70"
              >
                <X size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              className="px-4"
              style={{ maxHeight: 520 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
              <View className="h-4" />
            </ScrollView>

            {footer && <View className="px-4 pt-2">{footer}</View>}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5 gap-2">
      <Text className="text-body font-bold text-ink">{label}</Text>
      {children}
      {hint && <Text className="text-[11px] leading-4 text-ink-faint">{hint}</Text>}
    </View>
  );
}

export function BigButton({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center rounded-control py-4 active:opacity-75 ${
        disabled
          ? 'bg-surface-alt'
          : tone === 'danger'
            ? 'bg-bad'
            : 'bg-accent'
      }`}
    >
      <Text className={`text-body font-bold ${disabled ? 'text-ink-faint' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

/** L'explication en français courant, mise à jour pendant la saisie. */
export function Preview({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-control border border-accent bg-accent-dim px-3.5 py-3">
      <Text className="text-small leading-[21px] text-ink">{children}</Text>
    </View>
  );
}

export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-control border border-warn bg-warn-dim px-3.5 py-3">
      <Text className="text-small leading-5 text-warn">{children}</Text>
    </View>
  );
}

/** Champ de saisie standard. */
export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
}) {
  return (
    <TextInputShim
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
    />
  );
}

import { TextInput as TextInputShimBase } from 'react-native';
function TextInputShim(props: React.ComponentProps<typeof TextInputShimBase>) {
  return (
    <TextInputShimBase
      {...props}
      placeholderTextColor="#8492A0"
      className="rounded-control border border-line bg-surface px-4 py-3.5 text-body text-ink"
    />
  );
}
