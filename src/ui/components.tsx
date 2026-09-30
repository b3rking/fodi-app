import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { font, radius, space } from './tokens';
import { useTheme, useThemedStyles } from './ThemeProvider';
import type { Colors } from '../core/theme';

/** The building blocks. Every screen is made of these and nothing else. */

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, style }: { children: React.ReactNode; style?: object }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.muted}>{children}</Text>;
}

export function Big({ children, color }: { children: React.ReactNode; color?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return <Text style={[styles.big, { color: color ?? colors.text }]}>{children}</Text>;
}

/** A labelled figure. The label is the plain word, never a symbol. */
export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: color ?? colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: color ?? colors.text }]}>{value}</Text>
    </View>
  );
}

export function Divider() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.divider} />;
}

export function ActionButton({
  label,
  icon,
  onPress,
  tone = 'default',
}: {
  label: string;
  icon: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        tone === 'primary' && styles.actionPrimary,
        pressed && styles.actionPressed,
      ]}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

/** Empty states teach the next action instead of apologising. */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.emptyAction}>
          <Text style={styles.emptyActionLabel}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { ...font.label, color: colors.textMuted },
  muted: { ...font.small, color: colors.textMuted },
  big: { ...font.hero, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { ...font.body, color: colors.textMuted, flexShrink: 1, paddingRight: space.md },
  rowValue: { ...font.bodyStrong },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.md },
  stat: { flex: 1, marginRight: space.sm },
  statValue: { ...font.bodyStrong, color: colors.text, fontSize: 18 },
  statLabel: { ...font.tiny, color: colors.textMuted, marginTop: 2 },
  action: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPrimary: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  actionPressed: { opacity: 0.7 },
  actionIcon: { fontSize: 22, marginBottom: 4 },
  actionLabel: { ...font.small, color: colors.text, fontWeight: '600' },
  empty: { padding: space.xl, alignItems: 'center' },
  emptyTitle: { ...font.title, color: colors.text, marginBottom: space.sm, textAlign: 'center' },
  emptyBody: { ...font.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  emptyAction: {
    marginTop: space.lg,
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  emptyActionLabel: { ...font.bodyStrong, color: colors.text },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: space.sm,
  },
  chipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  chipLabel: { ...font.small, color: colors.textMuted },
  chipLabelActive: { color: colors.text, fontWeight: '600' },
  });