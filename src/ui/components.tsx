import React from 'react';
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
    </View>
  );
}

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
    </View>
  );
}

export function Divider() {
  return <View className="my-3 h-px bg-line" />;
}

export function ActionButton({
  label,
  icon: Icon,
  onPress,
  tone = 'default',
}: {
  label: string;
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
    </Pressable>
  );
}

/** Les états vides enseignent la prochaine action au lieu de s'excuser. */
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
        </Pressable>
      )}
    </View>
  );
}

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
    </Pressable>
  );
}

/** Icônes d'onglets. De vrais vecteurs, pas des caractères Unicode. */
export const TAB_ICONS = {
  today: Circle,
  trips: ArrowLeftRight,
  fuel: Fuel,
  money: Wallet,
  reports: BarChart3,
} as const;
