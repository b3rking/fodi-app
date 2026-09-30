import { Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, chromeFont, FONT_FAMILY } from '../../ui/tokens';
import { useTheme } from '../../ui/ThemeProvider';

/**
 * Five tabs. Not six.
 *
 * Every tab answers exactly one question. Anything that would need a sixth tab
 * belongs in a bottom sheet instead.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Android is edge-to-edge, so the tab bar has to reserve the gesture-bar /
  // navigation-bar height itself. Hardcoding a height left the buttons sitting
  // on top of the system bar on some devices.
  const bottomPadding = Math.max(insets.bottom, 8) + 8;
  const barHeight = 58 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: chromeFont,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Aujourd'hui", tabBarIcon: (p) => <Glyph glyph="◉" {...p} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'Trajets', tabBarIcon: (p) => <Glyph glyph="→" {...p} /> }} />
      <Tabs.Screen name="fuel" options={{ title: 'Carburant', tabBarIcon: (p) => <Glyph glyph="⛽" {...p} /> }} />
      <Tabs.Screen name="money" options={{ title: 'Argent', tabBarIcon: (p) => <Glyph glyph="₣" {...p} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Rapports', tabBarIcon: (p) => <Glyph glyph="▤" {...p} /> }} />
    </Tabs>
  );
}

function Glyph({ glyph, color, size }: { glyph: string; color: ColorValue; size?: number }) {
  return <Text style={[styles.glyph, { color, fontSize: size ?? 18 }]}>{glyph}</Text>;
}

const styles = StyleSheet.create({
  glyph: { ...font.body, includeFontPadding: false },
});