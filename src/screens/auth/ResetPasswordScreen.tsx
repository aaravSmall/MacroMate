import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import { useAuth, validateNewPassword, validatePasswordConfirmation } from '@/features/auth';
import { useTheme } from '@/theme';

type FieldErrors = { password?: string | null; confirm?: string | null };

/** Opened from the password reset email. AuthProvider verifies the link and sets `recovery`. */
export default function ResetPasswordScreen() {
  const { colors, spacing } = useTheme();
  const { recovery, session, updatePassword, finishRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function leave(to: '/' | '/forgot-password') {
    finishRecovery();
    router.replace(to);
  }

  async function handleSubmit() {
    const next: FieldErrors = {
      password: validateNewPassword(password),
      confirm: validatePasswordConfirmation(password, confirm),
    };
    setErrors(next);
    setFormError(null);
    if (next.password || next.confirm) return;

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    // Signed in with the new password: the index route sends them to onboarding or Today.
    leave('/');
  }

  if (!recovery || recovery.status === 'verifying') {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl }}>
          <ActivityIndicator color={colors.accent} />
          <Text tone="muted">Checking your reset link…</Text>
        </View>
      </Screen>
    );
  }

  if (recovery.status === 'error') {
    return (
      <Screen scroll>
        <Text variant="title">Reset link didn&apos;t work</Text>
        <Card>
          <Text>{recovery.message}</Text>
        </Card>
        {session ? (
          // Already signed in on this device; they can change it later.
          <Button title="Continue to the app" onPress={() => leave('/')} />
        ) : (
          <Button title="Send a new link" onPress={() => leave('/forgot-password')} />
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">Choose a new password</Text>
      <Text tone="muted">You&apos;ll stay signed in on this device.</Text>
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={handleSubmit}
      />
      {formError ? <Text tone="danger">{formError}</Text> : null}
      <Button title="Save new password" onPress={handleSubmit} loading={submitting} />
      <Button title="Not now" variant="ghost" onPress={() => leave('/')} />
    </Screen>
  );
}
