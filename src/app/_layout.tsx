import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme';

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen
          name="food-search"
          options={{ presentation: 'modal', headerShown: true, title: 'Search foods' }}
        />
        <Stack.Screen
          name="food-detail/[id]"
          options={{ presentation: 'modal', headerShown: true, title: 'Food' }}
        />
        <Stack.Screen
          name="create-food"
          options={{ presentation: 'modal', headerShown: true, title: 'Create food' }}
        />
        <Stack.Screen
          name="label-scan"
          options={{ presentation: 'modal', headerShown: true, title: 'Scan label' }}
        />
        <Stack.Screen
          name="log-entry/[id]"
          options={{ presentation: 'modal', headerShown: true, title: 'Entry' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
