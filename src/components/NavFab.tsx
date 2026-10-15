import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gauge, Menu, Settings, X } from 'lucide-react-native';
import { brandAction } from '../core/theme';
import { fr } from '../i18n/fr';

type Href = '/' | '/settings';

const entries: { href: Href; label: string; Icon: typeof Gauge }[] = [
  { href: '/', label: fr.nav.fuel, Icon: Gauge },
  { href: '/settings', label: fr.nav.settings, Icon: Settings },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Menu de navigation flottant, en bas à droite sur tous les écrans.
 * Ouverture/fermeture animées : fondu du voile, cascade des destinations,
 * rotation du bouton principal.
 */
export function NavFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const spin = useSharedValue(0);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 90}deg` }],
  }));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    spin.value = withTiming(next ? 1 : 0, { duration: 200 });
  };

  const isActive = (href: Href) =>
    href === '/' ? pathname === '/' || pathname === '/index' : pathname === href;

  const go = (href: Href) => {
    setOpen(false);
    spin.value = withTiming(0, { duration: 200 });
    if (!isActive(href)) router.push(href);
  };

  return (
    <View pointerEvents="box-none" className="absolute inset-0">
      {open ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={fr.nav.closeMenu}
          onPress={() => toggle()}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          className="absolute inset-0 bg-black/30"
        />
      ) : null}

      {open ? (
        <View className="absolute bottom-24 right-6 items-end gap-3">
          {entries.map(({ href, label, Icon }, index) => {
            const active = isActive(href);
            return (
              <Animated.View
                key={`${href}-${active ? 'on' : 'off'}`}
                entering={FadeInDown.duration(220).delay(index * 70)}
                exiting={FadeOut.duration(120)}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  onPress={() => go(href)}
                  className="flex-row items-center gap-2"
                >
                  <Text className="font-500 rounded-full bg-neutral-900 px-3 py-1 text-sm text-white dark:bg-neutral-100 dark:text-black">
                    {label}
                  </Text>
                  <View
                    className="items-center justify-center rounded-full p-3"
                    style={{ backgroundColor: active ? brandAction : '#525252' }}
                  >
                    <Icon size={22} color="#FFFFFF" />
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? fr.nav.closeMenu : fr.nav.openMenu}
        onPress={toggle}
        className="absolute bottom-6 right-6 items-center justify-center rounded-full p-4"
        style={{ backgroundColor: brandAction, elevation: 8 }}
      >
        <Animated.View style={spinStyle}>
          {open ? <X size={24} color="#FFFFFF" /> : <Menu size={24} color="#FFFFFF" />}
        </Animated.View>
      </Pressable>
    </View>
  );
}
