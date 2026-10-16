import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button } from '@/components/ui';

export default function GoalScreen() {
  return (
    <PlaceholderScreen
      title="Your goal"
      description="Lose, maintain, or gain weight, and at what pace. Fast paces get a caring heads-up, never a block."
    >
      <Button title="Continue" onPress={() => router.push('/motivation')} />
    </PlaceholderScreen>
  );
}
