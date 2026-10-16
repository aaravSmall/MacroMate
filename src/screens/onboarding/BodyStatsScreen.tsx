import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button } from '@/components/ui';

export default function BodyStatsScreen() {
  return (
    <PlaceholderScreen
      title="About you"
      description="Your weight, height, age, and sex, used to estimate how many calories you burn each day."
    >
      <Button title="Continue" onPress={() => router.push('/activity')} />
    </PlaceholderScreen>
  );
}
