import { Tabs } from 'expo-router';
import { colors } from '../../ui/tokens';

/**
 * Five tabs. Not six.
 *
 * Every tab answers exactly one question. Anything that would need a sixth
 * tab belongs in a bottom sheet instead.
 */
export default function TabsLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon glyph="◉" color={color} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: ({ color }) => <Icon glyph="→" color={color} /> }} />
      <Tabs.Screen name="fuel" options={{ title: 'Fuel', tabBarIcon: ({ color }) => <Icon glyph="⛽" color={color} /> }} />
      <Tabs.Screen name="money" options={{ title: 'Money', tabBarIcon: ({ color }) => <Icon glyph="₣" color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: ({ color }) => <Icon glyph="▤" color={color} /> }} />
    </Tabs>
  );
}

function Icon({ glyph, color }: { glyph: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}