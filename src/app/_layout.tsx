import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders } from '@/components/AppProviders';
import { useAuth } from '@/features/auth';
import { useOnboardingComplete } from '@/features/onboarding';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const modal = { presentation: 'modal', headerShown: true } as const;

function RootNavigator() {
  const { session, loading } = useAuth();
  const onboardingComplete = useOnboardingComplete();

  // Keep the splash screen up until we know where to send the user.
  const ready = !loading && (!session || onboardingComplete !== null);
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);
  if (!ready) return null;

  const signedIn = !!session;
  const onboarded = onboardingComplete === true;

  // Gate: no session → (auth); session but not onboarded → (onboarding); else → (tabs).
  // Stack.Protected redirects away from any group whose guard is false.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="food-search" options={{ ...modal, title: 'Search foods' }} />
        <Stack.Screen name="food-detail/[id]" options={{ ...modal, title: 'Food' }} />
        <Stack.Screen name="create-food" options={{ ...modal, title: 'Create food' }} />
        <Stack.Screen name="label-scan" options={{ ...modal, title: 'Scan label' }} />
        <Stack.Screen name="log-entry/[id]" options={{ ...modal, title: 'Entry' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
