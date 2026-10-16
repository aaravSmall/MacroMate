import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { deleteAccount } from '@/features/account';

const ERASED = [
  'Your account and sign-in',
  'Your profile, goals, and settings',
  'Every food log, exercise entry, and weigh-in',
  'Your My Foods',
];

export default function DeleteAccountScreen() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setDeleting(false);
    }
  }

  function handlePress() {
    Alert.alert(
      'Delete your account?',
      'All of your data will be permanently erased. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => void confirmDelete() },
      ],
    );
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Text>Deleting your account permanently erases all of your data:</Text>
      <Card>
        {ERASED.map((item) => (
          <Text key={item} variant="callout">
            • {item}
          </Text>
        ))}
      </Card>
      <Text variant="callout" tone="muted">
        Foods you shared to the global database stay available to others, with your name removed.
        This can&apos;t be undone.
      </Text>
      {error ? <Text tone="danger">{error}</Text> : null}
      <Button
        title="Delete my account"
        variant="secondary"
        onPress={handlePress}
        loading={deleting}
      />
    </Screen>
  );
}
