import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, space } from './tokens';

/**
 * A bottom sheet.
 *
 * New data is entered in a sheet, never a new screen. The rule keeps the app
 * at five tabs: if entering a trip needed its own screen, we would be at six.
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
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer && <View style={styles.footer}>{footer}</View>}
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
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint && <Text style={styles.hint}>{hint}</Text>}
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
      style={({ pressed }) => [
        styles.bigButton,
        tone === 'danger' && styles.bigButtonDanger,
        disabled && styles.bigButtonDisabled,
        pressed && !disabled && { opacity: 0.75 },
      ]}
    >
      <Text style={styles.bigButtonLabel}>{label}</Text>
    </Pressable>
  );
}

/** The live plain-English explanation shown while he types. */
export function Preview({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.preview}>
      <Text style={styles.previewText}>{children}</Text>
    </View>
  );
}

export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.warning}>
      <Text style={styles.warningText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
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