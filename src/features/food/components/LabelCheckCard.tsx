import { View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Optional "Does this match the label?" check on a public food someone else added. Sits inline
 * and never interrupts logging. Shows the user's current answer, which they can change.
 */
export function LabelCheckCard({
  answer,
  pending,
  onAnswer,
}: {
  answer: boolean | null;
  pending: boolean;
  onAnswer: (matches: boolean) => void;
}) {
  const { spacing } = useTheme();
  return (
    <Card>
      <Text variant="callout">Do these nutrition facts match the label?</Text>
      <Text variant="caption" tone="muted">
        {answer === null
          ? 'Optional. If you have the package, your answer helps others.'
          : answer
            ? 'You said it matches. Thanks for checking!'
            : "You said it doesn't match. Thanks for checking!"}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title="✓ Matches"
          variant={answer === true ? 'primary' : 'secondary'}
          onPress={() => onAnswer(true)}
          disabled={pending || answer === true}
        />
        <Button
          title="✗ Doesn't match"
          variant={answer === false ? 'primary' : 'secondary'}
          onPress={() => onAnswer(false)}
          disabled={pending || answer === false}
        />
      </View>
    </Card>
  );
}
