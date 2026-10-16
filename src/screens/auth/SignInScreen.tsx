import { Link } from 'expo-router';
import { useState } from 'react';

import { Button, Screen, Text, TextField } from '@/components/ui';
import { useAuth, validateEmail } from '@/features/auth';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const next = {
      email: validateEmail(email),
      // Only check presence here; length rules apply at sign-up.
      password: password === '' ? 'Enter your password.' : null,
    };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setFormError(error);
    // On success the root gate redirects automatically.
  }

  return (
    <Screen scroll>
      <Text variant="title">Sign in</Text>
      <Text tone="muted">Welcome back. Sign in to sync your log across devices.</Text>
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
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={handleSubmit}
      />
      {formError ? <Text tone="danger">{formError}</Text> : null}
      <Button title="Sign in" onPress={handleSubmit} loading={submitting} />
      <Link href="/forgot-password">
        <Text tone="accent">Forgot password?</Text>
      </Link>
      <Link href="/sign-up">
        <Text tone="accent">New here? Create an account</Text>
      </Link>
    </Screen>
  );
}
