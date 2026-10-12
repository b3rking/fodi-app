import React from 'react';
<<<<<<< HEAD
import { Pressable, Text, View } from 'react-native';
import { Circle, ArrowLeftRight, Fuel, Wallet, BarChart3, type LucideIcon } from 'lucide-react-native';
import { useTheme } from './ThemeProvider';

/**
 * Les briques de base. Chaque écran est construit avec ça, rien d'autre.
 *
 * Les couleurs viennent de NativeWind (`bg-surface`, `text-ink`), donc le thème
 * clair/sombre fonctionne sans props. useTheme() n'est utilisé que là où une
 * valeur doit être calculée en JS : fills SVG et icônes.
 */

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {children}
    </View>
  );
}

export function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-[11px] font-bold uppercase tracking-widest text-ink-muted ${className}`}>{children}</Text>;
}

export function Muted({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-small text-ink-muted ${className}`}>{children}</Text>;
}

/** Petit titre d'écran. */
export function Title({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-title font-bold text-ink ${className}`}>{children}</Text>;
}

/** Un chiffre paired with a plain-word label. Jamais un symbole. */
export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'bad';
}) {
  const toneClass =
    tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <View className="flex-1 pr-2">
      <Text className={`text-[17px] font-bold ${toneClass}`} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] text-ink-muted">{label}</Text>
=======
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
    </View>
  );
}

<<<<<<< HEAD
export function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'bad';
}) {
  const toneClass =
    tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="flex-shrink pr-3 text-body text-ink-muted">{label}</Text>
      <Text className={`text-body font-bold ${toneClass}`}>{value}</Text>
=======
export function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: color ?? colors.text }]}>{value}</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
    </View>
  );
}

export function Divider() {
<<<<<<< HEAD
  return <View className="my-3 h-px bg-line" />;
=======
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.divider} />;
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
}

export function ActionButton({
  label,
<<<<<<< HEAD
  icon: Icon,
=======
  icon,
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
  onPress,
  tone = 'default',
}: {
  label: string;
<<<<<<< HEAD
  icon: LucideIcon;
  onPress: () => void;
  tone?: 'default' | 'primary';
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.accentDim }}
      className={`flex-1 items-center gap-1 rounded-control border px-2 py-3.5 active:opacity-70 ${
        tone === 'primary'
          ? 'border-accent bg-accent-dim'
          : 'border-line bg-surface-alt'
      }`}
    >
      <Icon size={22} color={tone === 'primary' ? colors.accent : colors.text} strokeWidth={2} />
      <Text className="text-[11px] font-bold text-ink">{label}</Text>
=======
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
    </Pressable>
  );
}

<<<<<<< HEAD
/** Les états vides enseignent la prochaine action au lieu de s'excuser. */
=======
/** Empty states teach the next action instead of apologising. */
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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
<<<<<<< HEAD
  const { colors } = useTheme();
  return (
    <View className="items-center px-6 py-8">
      <Text className="mb-2 text-center text-title font-bold text-ink">{title}</Text>
      <Text className="text-center text-body leading-6 text-ink-muted">{body}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          android_ripple={{ color: colors.accentDim }}
          className="mt-6 rounded-control border border-accent bg-accent-dim px-6 py-3 active:opacity-70"
        >
          <Text className="text-body font-bold text-ink">{actionLabel}</Text>
=======
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.emptyAction}>
          <Text style={styles.emptyActionLabel}>{actionLabel}</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        </Pressable>
      )}
    </View>
  );
}

<<<<<<< HEAD
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-chip border px-4 py-2 active:opacity-70 ${
        active ? 'border-accent bg-accent-dim' : 'border-line bg-surface-alt'
      }`}
    >
      <Text className={`text-small ${active ? 'font-bold text-ink' : 'text-ink-muted'}`}>
        {label}
      </Text>
=======
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
    </Pressable>
  );
}

<<<<<<< HEAD
/** Icônes d'onglets. De vrais vecteurs, pas des caractères Unicode. */
export const TAB_ICONS = {
  today: Circle,
  trips: ArrowLeftRight,
  fuel: Fuel,
  money: Wallet,
  reports: BarChart3,
} as const;
=======
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
