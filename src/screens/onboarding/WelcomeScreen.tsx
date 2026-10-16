import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button } from '@/components/ui';

export default function WelcomeScreen() {
  return (
    <PlaceholderScreen
      title="Welcome"
      description="A free calorie tracker with every feature included. A few quick questions will set up your daily goal."
    >
      <Button title="Continue" onPress={() => router.push('/body-stats')} />
    </PlaceholderScreen>
  );
}
