import { Tabs } from 'expo-router';
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
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
