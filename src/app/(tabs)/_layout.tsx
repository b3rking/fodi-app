import { Tabs } from 'expo-router';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { StyleSheet, Text, type ColorValue } from 'react-native';
import { font, chromeFont } from '../../ui/tokens';

/**
 * Five tabs. Not six.
 *
 * Every tab answers exactly one question. Anything that would need a sixth tab
 * belongs in a bottom sheet instead.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
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
  const styles = useThemedStyles(makeStyles);

  return <Text style={[styles.glyph, { color, fontSize: size ?? 18 }]}>{glyph}</Text>;
}

const makeStyles = () =>
  StyleSheet.create({
    glyph: { ...font.body, includeFontPadding: false },
  });