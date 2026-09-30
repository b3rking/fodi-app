import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
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
        <StatusBarAdapter />
        <StackHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function StatusBarAdapter() {
  const { scheme } = useTheme();
  // Follow the theme so the bar is not white-on-white in light mode.
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

function StackHost() {
  const { colors } = useTheme();
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
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
  );
}