import { Tabs } from 'expo-router';
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