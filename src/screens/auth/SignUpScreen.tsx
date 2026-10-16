import { Link } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Text } from '@/components/ui';

export default function SignUpScreen() {
  return (
    <PlaceholderScreen
      title="Create account"
      description="Create a free account with your email. Every feature is free, with no paywall."
    >
      <Link href="/sign-in">
        <Text tone="accent">Already have an account? Sign in</Text>
      </Link>
    </PlaceholderScreen>
  );
}
