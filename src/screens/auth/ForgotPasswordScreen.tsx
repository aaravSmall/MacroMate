import { Link } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import { useAuth, validateEmail } from '@/features/auth';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const error = validateEmail(email);
    setEmailError(error);
    setFormError(null);
    if (error) return;

    setSubmitting(true);
    const result = await resetPassword(email.trim());
    setSubmitting(false);
    if (result.error) setFormError(result.error);
    else setSent(true);
  }

  return (
    <Screen scroll>
      <Text variant="title">Reset password</Text>
      {sent ? (
        <Card>
          <Text>
            If an account exists for {email.trim()}, you&apos;ll get an email with a link to reset
            your password.
          </Text>
        </Card>
      ) : (
        <>
          <Text tone="muted">
            Enter your email and we&apos;ll send you a link to reset your password.
          </Text>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={handleSubmit}
          />
          {formError ? <Text tone="danger">{formError}</Text> : null}
          <Button title="Send reset link" onPress={handleSubmit} loading={submitting} />
        </>
      )}
      <Link href="/sign-in">
        <Text tone="accent">Back to sign in</Text>
      </Link>
    </Screen>
  );
}
