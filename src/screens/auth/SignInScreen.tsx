import { Link } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Text } from '@/components/ui';

export default function SignInScreen() {
  return (
    <PlaceholderScreen
      title="Sign in"
      description="Sign in with your email to sync your log across devices."
    >
      <Link href="/sign-up">
        <Text tone="accent">Create an account</Text>
      </Link>
      <Link href="/forgot-password">
        <Text tone="accent">Forgot password?</Text>
      </Link>
    </PlaceholderScreen>
  );
}
