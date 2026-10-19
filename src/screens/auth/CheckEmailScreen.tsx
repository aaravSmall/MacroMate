import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth';

/** Matches the server's `max_frequency` for auth emails. */
const RESEND_COOLDOWN_S = 60;

/**
 * After sign-up (or signing in before confirming): explains the confirmation email and lets the
 * user resend it. The link opens the app at confirm-email, which signs them in.
 */
export default function CheckEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { resendConfirmation } = useAuth();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (!email) return;
    setSending(true);
    const { error } = await resendConfirmation(email);
    setSending(false);
    setMessage(
      error ? { text: error, error: true } : { text: 'Sent. Check your inbox.', error: false },
    );
    setCooldown(RESEND_COOLDOWN_S);
  }

  return (
    <Screen scroll>
      <Text variant="title">Check your email</Text>
      <Card>
        <Text>
          We sent a confirmation link to {email || 'your email'}. Open it on this phone and
          you&apos;ll come right back here, signed in.
        </Text>
        <Text variant="callout" tone="muted">
          Can&apos;t find it? Check spam or promotions. The link works once and expires after an
          hour.
        </Text>
      </Card>
      {message ? <Text tone={message.error ? 'danger' : 'muted'}>{message.text}</Text> : null}
      {email ? (
        <Button
          title={cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend email'}
          variant="secondary"
          onPress={resend}
          disabled={cooldown > 0}
          loading={sending}
        />
      ) : null}
      <Link href="/sign-in">
        <Text tone="accent">Back to sign in</Text>
      </Link>
    </Screen>
  );
}
