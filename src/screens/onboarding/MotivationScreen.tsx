import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button } from '@/components/ui';

export default function MotivationScreen() {
  return (
    <PlaceholderScreen
      title="Your why"
      description="What brings you here, so the app can support what matters to you."
    >
      <Button title="Continue" onPress={() => router.push('/diet-restrictions')} />
    </PlaceholderScreen>
  );
}
