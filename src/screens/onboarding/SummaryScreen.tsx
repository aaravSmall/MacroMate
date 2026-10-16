import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button } from '@/components/ui';

export default function SummaryScreen() {
  return (
    <PlaceholderScreen
      title="Summary"
      description="Review your daily calorie budget and macro targets before you start logging."
    >
      <Button title="Start logging" onPress={() => router.replace('/today')} />
    </PlaceholderScreen>
  );
}
