import { Tabs } from 'expo-router';
<<<<<<< HEAD
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ColorValue } from 'react-native';
import { useTheme } from '../../ui/ThemeProvider';
import { TAB_ICONS } from '../../ui/components';

/**
 * Cinq onglets. Pas six.
 *
 * Chaque onglet répond à exactement une question. Tout ce qui demanderait un
 * sixième onglet appartient à une feuille.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Android est en edge-to-edge : la barre d'onglets doit elle-même réserver la
  // hauteur de la barre système. Une hauteur en dur la collait au bouton.
  const bottomPadding = Math.max(insets.bottom, 8) + 8;
  const barHeight = 58 + bottomPadding;

  // React Navigation types the colour as ColorValue (it can be an opaque
  // platform colour); Lucide needs a plain string, so narrow it here once.
  const icon =
    (name: keyof typeof TAB_ICONS) =>
    ({ color, size }: { color: ColorValue; size: number }) => {
      const Icon = TAB_ICONS[name];
      const tint = typeof color === 'string' ? color : colors.text;
      return <Icon size={size ?? 22} color={tint} strokeWidth={2} />;
    };
=======
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { StyleSheet, Text, type ColorValue } from 'react-native';
import { font } from '../../ui/tokens';

/**
 * Five tabs. Not six.
 *
 * Every tab answers exactly one question. Anything that would need a sixth tab
 * belongs in a bottom sheet instead.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
<<<<<<< HEAD
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'ProductSans_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Aujourd'hui", tabBarIcon: icon('today') }} />
      <Tabs.Screen name="trips" options={{ title: 'Trajets', tabBarIcon: icon('trips') }} />
      <Tabs.Screen name="fuel" options={{ title: 'Carburant', tabBarIcon: icon('fuel') }} />
      <Tabs.Screen name="money" options={{ title: 'Argent', tabBarIcon: icon('money') }} />
      <Tabs.Screen name="reports" options={{ title: 'Rapports', tabBarIcon: icon('reports') }} />
    </Tabs>
  );
}
=======
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: (p) => <Glyph glyph="◉" {...p} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: (p) => <Glyph glyph="→" {...p} /> }} />
      <Tabs.Screen name="fuel" options={{ title: 'Fuel', tabBarIcon: (p) => <Glyph glyph="⛽" {...p} /> }} />
      <Tabs.Screen name="money" options={{ title: 'Money', tabBarIcon: (p) => <Glyph glyph="₣" {...p} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: (p) => <Glyph glyph="▤" {...p} /> }} />
    </Tabs>
  );
}

function Glyph({ glyph, color, size }: { glyph: string; color: ColorValue; size?: number }) {
  const styles = useThemedStyles(makeStyles);

  return <Text style={[styles.glyph, { color, fontSize: size ?? 18 }]}>{glyph}</Text>;
}

const makeStyles = () =>
  StyleSheet.create({
    glyph: { ...font.body, includeFontPadding: false },
  });
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
