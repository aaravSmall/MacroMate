import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button } from '@/components/ui';

export default function ActivityScreen() {
  return (
    <PlaceholderScreen
      title="Activity level"
      description="How active you are on a typical day, so your budget reflects your real energy use."
    >
      <Button title="Continue" onPress={() => router.push('/goal')} />
    </PlaceholderScreen>
  );
}
