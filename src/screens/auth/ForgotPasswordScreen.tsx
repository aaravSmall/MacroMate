import { Link } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Text } from '@/components/ui';

export default function ForgotPasswordScreen() {
  return (
    <PlaceholderScreen
      title="Reset password"
      description="Enter your email and we'll send you a link to reset your password."
    >
      <Link href="/sign-in">
        <Text tone="accent">Back to sign in</Text>
      </Link>
    </PlaceholderScreen>
  );
}
