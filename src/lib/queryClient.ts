import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        retry: 2,
        // React Native has no window focus; see focusManager wiring below.
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/** Refetch stale queries when the app returns to the foreground. */
export function wireAppStateFocus(): () => void {
  if (Platform.OS === 'web') return () => {};
  const subscription = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
  return () => subscription.remove();
}
