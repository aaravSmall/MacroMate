import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button } from '@/components/ui';

export default function DietRestrictionsScreen() {
  return (
    <PlaceholderScreen
      title="Diet & allergies"
      description="Any dietary restrictions or allergies to keep in mind."
    >
      <Button title="Continue" onPress={() => router.push('/summary')} />
    </PlaceholderScreen>
  );
}
