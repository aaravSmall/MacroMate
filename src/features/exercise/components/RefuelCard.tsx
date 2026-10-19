import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { CareNotice } from '@/features/goals';
import type { DietaryPrefs } from '@/lib/dietary';
import { useTheme } from '@/theme';
import type { ExerciseEntry } from '@/types/domain';

import { refuelMessage } from '../logic/refuel';

/**
 * "Nice workout! You burned X cal. Don't forget to refuel." with a tip for the workout type and
 * a quick way to log food. Shown once per workout: logging or dismissing both mark it done.
 */
export function RefuelCard({
  workout,
  numbersOff,
  prefs,
  onLogFood,
  onDone,
}: {
  workout: Pick<ExerciseEntry, 'activityType' | 'activeCalories'>;
  numbersOff: boolean;
  prefs: DietaryPrefs;
  onLogFood: () => void;
  onDone: () => void;
}) {
  const { spacing } = useTheme();
  const { title, message, tip } = refuelMessage({
    activityType: workout.activityType,
    burnedKcal: workout.activeCalories,
    numbersOff,
    prefs,
  });
  return (
    <CareNotice title={title} message={message} showHelpLink={false}>
      <Text variant="callout" tone="muted">
        {tip}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title="Log food"
          onPress={() => {
            onDone();
            onLogFood();
          }}
        />
        <Button title="Dismiss" variant="ghost" onPress={onDone} />
      </View>
    </CareNotice>
  );
}
