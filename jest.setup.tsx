// Test-only values so modules that validate env (src/lib/env.ts) can load.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Icon fonts can't load under Jest; render icons as their name instead.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = jest.requireActual('react-native');
  const Icon = ({ name }: { name: string }) => <Text accessibilityElementsHidden>{name}</Text>;
  return { __esModule: true, default: Icon };
});
