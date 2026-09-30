import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '../ui/ThemeProvider';
import { useAppStore } from '../store/useAppStore';

export default function RootLayout() {
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
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="first-run" options={{ headerShown: false }} />
    </Stack>
  );
}