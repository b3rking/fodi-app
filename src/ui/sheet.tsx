import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
<<<<<<< HEAD
=======
  StyleSheet,
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
<<<<<<< HEAD
import { X } from 'lucide-react-native';
import { useTheme } from './ThemeProvider';

/**
 * Une feuille qui monte du bas.
 *
 * Les nouvelles données se saisissent dans une feuille, jamais sur un nouvel
 * écran. Cette règle garde l'application à cinq onglets : si saisir un trajet
 * exigeait son propre écran, on serait à six.
=======
import { font, radius, space } from './tokens';
import { useTheme, useThemedStyles } from './ThemeProvider';
import type { Colors } from '../core/theme';

/**
 * A bottom sheet.
 *
 * New data is entered in a sheet, never a new screen. The rule keeps the app
 * at five tabs: if entering a trip needed its own screen, we would be at six.
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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
<<<<<<< HEAD

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
=======
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <ScrollView
              style={styles.body}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
<<<<<<< HEAD
              <View className="h-4" />
            </ScrollView>

            {footer && <View className="px-4 pt-2">{footer}</View>}
=======
            </ScrollView>
            {footer && <View style={styles.footer}>{footer}</View>}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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
<<<<<<< HEAD
  return (
    <View className="mb-5 gap-2">
      <Text className="text-body font-bold text-ink">{label}</Text>
      {children}
      {hint && <Text className="text-[11px] leading-4 text-ink-faint">{hint}</Text>}
=======
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint && <Text style={styles.hint}>{hint}</Text>}
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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
<<<<<<< HEAD
=======
  const styles = useThemedStyles(makeStyles);

>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
<<<<<<< HEAD
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
=======
      style={({ pressed }) => [
        styles.bigButton,
        tone === 'danger' && styles.bigButtonDanger,
        disabled && styles.bigButtonDisabled,
        pressed && !disabled && { opacity: 0.75 },
      ]}
    >
      <Text style={styles.bigButtonLabel}>{label}</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
    </Pressable>
  );
}

<<<<<<< HEAD
/** L'explication en français courant, mise à jour pendant la saisie. */
export function Preview({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-control border border-accent bg-accent-dim px-3.5 py-3">
      <Text className="text-small leading-[21px] text-ink">{children}</Text>
=======
/** The live plain-English explanation shown while he types. */
export function Preview({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.preview}>
      <Text style={styles.previewText}>{children}</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
    </View>
  );
}

export function Warning({ children }: { children: React.ReactNode }) {
<<<<<<< HEAD
  return (
    <View className="rounded-control border border-warn bg-warn-dim px-3.5 py-3">
      <Text className="text-small leading-5 text-warn">{children}</Text>
=======
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.warning}>
      <Text style={styles.warningText}>{children}</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
    </View>
  );
}

<<<<<<< HEAD
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
=======
const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheetWrap: { maxHeight: '92%' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: space.md,
  },
  header: { marginBottom: space.lg },
  title: { ...font.title, color: colors.text },
  subtitle: { ...font.small, color: colors.textMuted, marginTop: 2 },
  body: { marginBottom: space.lg },
  footer: { paddingTop: space.sm },
  field: { marginBottom: space.lg, gap: space.sm },
  label: { ...font.bodyStrong, color: colors.text },
  hint: { ...font.tiny, color: colors.textFaint },
  bigButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  bigButtonDanger: { backgroundColor: colors.bad },
  bigButtonDisabled: { backgroundColor: colors.surfaceAlt },
  bigButtonLabel: { ...font.bodyStrong, color: colors.text },
  preview: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: space.md,
  },
  previewText: { ...font.small, color: colors.text, lineHeight: 21 },
  warning: {
    backgroundColor: colors.warnDim,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warn,
    padding: space.md,
  },
  warningText: { ...font.small, color: colors.warn, lineHeight: 20 },
  });
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
