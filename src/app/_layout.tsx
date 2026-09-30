import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '../ui/ThemeProvider';
import { useAppFonts } from '../ui/fonts';
import { useAppStore } from '../store/useAppStore';
import { FONT_FAMILY } from '../ui/tokens';

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  // Hold the first frame until the font is in memory, otherwise every number
  // visibly reflows once it arrives.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { colors, scheme } = useTheme();
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  // Android runs edge-to-edge, so the status bar and gesture bar are
  // transparent and show whatever the window background is. Without this the
  // top of the screen stays black in light mode and the dark status-bar icons
  // become invisible against it. This is the fix.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  return (
    // Paint the whole window, including the areas behind the system bars, so
    // there is no black band above or below the app in light mode.
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: FONT_FAMILY.bold },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="first-run" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = {
  root: { flex: 1 },
} as const;
