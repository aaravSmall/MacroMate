import { Link } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth';

/**
 * Where a sign-up confirmation link lands. AuthProvider signs the user in from the link; on
 * success the session moves them on to onboarding, so this only shows progress or a problem.
 */
export default function ConfirmEmailScreen() {
  const { emailConfirmation } = useAuth();

  if (emailConfirmation?.status === 'error') {
    return (
      <Screen scroll>
        <Text variant="title">Couldn&apos;t confirm your email</Text>
        <Card>
          <Text>{emailConfirmation.message}</Text>
        </Card>
        <Link href="/sign-in">
          <Text tone="accent">Go to sign in</Text>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">Confirming your email…</Text>
      <ActivityIndicator />
    </Screen>
  );
}
