import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { brandAction } from '../core/theme';
import { useToastStore } from '../store/toastStore';
import { fr } from '../i18n/fr';

const VISIBLE_MS = 3000;

/**
 * Bandeau de notification animé, centré au-dessus du bouton de navigation.
 * S'affiche sur toutes les routes, se masque seul, action facultative.
 */
export function Toast() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-24 items-center">
      <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutDown.duration(160)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.toast.dismiss}
          onPress={dismiss}
          className="max-w-full flex-row items-center gap-3 rounded-full bg-neutral-900 py-3 pl-4 pr-3 dark:bg-neutral-100"
        >
          <Text className="font-400 shrink text-sm text-white dark:text-black">
            {toast.message}
          </Text>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
              onPress={() => {
                toast.action?.onPress();
                dismiss();
              }}
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: brandAction }}
            >
              <Text className="font-500 text-sm text-white">{toast.action.label}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}
