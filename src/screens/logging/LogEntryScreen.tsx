import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Text } from '@/components/ui';

export default function LogEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PlaceholderScreen
      title="Log entry"
      description="This entry's time, meal label, servings, and macros, with options to edit or delete."
      edges={['bottom', 'left', 'right']}
    >
      <Text tone="muted" variant="caption">
        Entry ID: {id}
      </Text>
    </PlaceholderScreen>
  );
}
