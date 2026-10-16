import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Text } from '@/components/ui';

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PlaceholderScreen
      title="Food details"
      description="Nutrition for this food, with a serving picker and meal label to log it."
      edges={['bottom', 'left', 'right']}
    >
      <Text tone="muted" variant="caption">
        Food ID: {id}
      </Text>
    </PlaceholderScreen>
  );
}
