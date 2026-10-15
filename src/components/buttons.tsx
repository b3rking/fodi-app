import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { brandAction } from '../core/theme';

/** Écrasement au toucher partagé par tous les boutons (retour tactile). */
function usePressScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return {
    style,
    onPressIn: () => {
      scale.value = withSpring(0.96, { damping: 12, stiffness: 400 });
    },
    onPressOut: () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 400 });
    },
  };
}

interface BaseProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Bouton d'action principal (jaune de marque, texte blanc).
 * Même animation et même style sur tous les écrans.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
}: BaseProps & { loading?: boolean; icon?: ReactNode }) {
  const press = usePressScale();
  return (
    <Animated.View style={[press.style, { flex: 1, opacity: disabled ? 0.7 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, busy: loading }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={disabled}
        className="flex-row items-center justify-center gap-2 rounded-full px-4 py-3"
        style={{ backgroundColor: brandAction }}
      >
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : icon}
        <Text className="font-500 text-base text-white">{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Bouton secondaire (fond neutre, texte thémé). */
export function SecondaryButton({ label, onPress }: BaseProps) {
  const press = usePressScale();
  return (
    <Animated.View style={[press.style, { flex: 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        className="items-center rounded-full bg-neutral-200 px-4 py-3 dark:bg-neutral-700"
      >
        <Text className="font-500 text-base text-black dark:text-white">{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Bouton icône circulaire (retour, etc.). */
export function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        className="rounded-full bg-neutral-100 p-2 text-black dark:bg-neutral-800 dark:text-white"
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
