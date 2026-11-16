import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProvider, useApp } from '@/app-context';
import { LockGate } from '@/components/lock-gate';
import { rescheduleAll } from '@/lib/notifications';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <Root />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const { settings } = useApp();
  const scheme = useColorScheme();
  const c = useColors();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    if (settings.onboarded) rescheduleAll().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.bg, text: c.ink, border: c.line, primary: c.accent },
  };
  const detail = { headerShown: true, headerShadowVisible: false, headerTintColor: c.accent, headerTitleStyle: { color: c.ink }, headerBackTitle: '뒤로' };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <LockGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Protected guard={settings.onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="write" options={{ presentation: 'modal' }} />
            <Stack.Screen name="saved" options={{ presentation: 'modal', gestureEnabled: true }} />
            <Stack.Screen name="entry" options={{ ...detail, title: '' }} />
            <Stack.Screen name="calendar" options={{ ...detail, title: '달력' }} />
            <Stack.Screen name="anniversaries" options={{ ...detail, title: '나의 연례 행사' }} />
          </Stack.Protected>
          <Stack.Protected guard={!settings.onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Screen name="passcode" options={{ presentation: 'modal' }} />
        </Stack>
      </LockGate>
    </ThemeProvider>
  );
}
