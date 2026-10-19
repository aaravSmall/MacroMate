import { Link } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import {
  DEMO_PASSWORD,
  DEMO_USERNAME,
  resolveLoginEmail,
  useAuth,
  validateEmail,
} from '@/features/auth';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  async function handleSubmit() {
    const loginEmail = resolveLoginEmail(email);
    const next = {
      email: validateEmail(loginEmail),
      // Only check presence here; length rules apply at sign-up.
      password: password === '' ? 'Enter your password.' : null,
    };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    setSubmitting(true);
    const { error, emailNotConfirmed } = await signIn(loginEmail, password);
    setSubmitting(false);
    if (error) setFormError(error);
    setUnconfirmedEmail(emailNotConfirmed ? loginEmail : null);
    // On success the root gate redirects automatically.
  }

  return (
    <Screen scroll>
      <Text variant="title">Sign in</Text>
      <Text tone="muted">Welcome back. Sign in to sync your log across devices.</Text>
      {__DEV__ ? (
        <Card>
          <Text variant="label" tone="muted">
            Demo account (development builds only)
          </Text>
          <Text variant="callout">
            Username: {DEMO_USERNAME}
            {'\n'}Password: {DEMO_PASSWORD}
          </Text>
        </Card>
      ) : null}
      <TextField
        label={__DEV__ ? 'Email (or demo)' : 'Email'}
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
      {unconfirmedEmail ? (
        <Link href={{ pathname: '/check-email', params: { email: unconfirmedEmail } }}>
          <Text tone="accent">Resend confirmation email</Text>
        </Link>
      ) : null}
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
