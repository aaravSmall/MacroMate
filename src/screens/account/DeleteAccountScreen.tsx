import { Alert } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useDeleteAccount } from '@/features/account';

const ERASED = [
  'Your account and sign-in',
  'Your profile, goals, and settings',
  'Every food log, exercise entry, and weigh-in',
  'Your My Foods',
];

export default function DeleteAccountScreen() {
  // On success the hook routes to sign-in; the button stays in its loading state until then,
  // so there's no flash of the form or an error.
  const deleteAccount = useDeleteAccount();
  const error = deleteAccount.error;

  function handlePress() {
    Alert.alert(
      'Delete your account?',
      'All of your data will be permanently erased. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => deleteAccount.mutate() },
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
        Foods you shared publicly stay available to others, no longer linked to you. This can&apos;t
        be undone.
      </Text>
      {error && !deleteAccount.isPending ? <Text tone="danger">{error.message}</Text> : null}
      <Button
        title="Delete my account"
        variant="secondary"
        onPress={handlePress}
        loading={deleteAccount.isPending || deleteAccount.isSuccess}
      />
    </Screen>
  );
}
