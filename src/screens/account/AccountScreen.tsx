import { Link } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Divider, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setSigningOut(true);
    const result = await signOut();
    setSigningOut(false);
    setError(result.error);
  }

  return (
    <Screen scroll>
      <Text variant="title">Account</Text>
      <Card>
        <Text variant="label" tone="muted">
          Signed in as
        </Text>
        <Text>{user?.email ?? '—'}</Text>
      </Card>
      <Card>
        <Link href="/account/settings">
          <Text>Settings</Text>
        </Link>
        <Divider />
        <Link href="/account/help">
          <Text>Help & resources</Text>
        </Link>
        <Divider />
        <Link href="/account/delete-account">
          <Text tone="danger">Delete account</Text>
        </Link>
      </Card>
      {error ? <Text tone="danger">{error}</Text> : null}
      <Button title="Sign out" variant="secondary" onPress={handleSignOut} loading={signingOut} />
    </Screen>
  );
}
