import { Link, router } from 'expo-router';
import { useState } from 'react';

import { Button, Screen, Text, TextField } from '@/components/ui';
import {
  useAuth,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
} from '@/features/auth';

type FieldErrors = { email?: string | null; password?: string | null; confirm?: string | null };

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const next: FieldErrors = {
      email: validateEmail(email),
      password: validateNewPassword(password),
      confirm: validatePasswordConfirmation(password, confirm),
    };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password || next.confirm) return;

    setSubmitting(true);
    const result = await signUp(email.trim(), password);
    setSubmitting(false);
    if (result.error) setFormError(result.error);
    else if (result.needsEmailConfirmation) {
      router.replace({ pathname: '/check-email', params: { email: email.trim() } });
    }
    // Otherwise a session exists and the root gate moves on to onboarding.
  }

  return (
    <Screen scroll>
      <Text variant="title">Create account</Text>
      <Text tone="muted">Every feature is free, with no paywall.</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={handleSubmit}
      />
      {formError ? <Text tone="danger">{formError}</Text> : null}
      <Button title="Create account" onPress={handleSubmit} loading={submitting} />
      <Link href="/sign-in">
        <Text tone="accent">Already have an account? Sign in</Text>
      </Link>
    </Screen>
  );
}
