import { View } from 'react-native';

import { SegmentedControl, Text, TextField } from '@/components/ui';
import { CareNotice, paceCautionCopy } from '@/features/goals';
import {
  assessFormPace,
  OnboardingStepLayout,
  OptionCard,
  PACE_OPTIONS,
  useOnboardingStore,
} from '@/features/onboarding';
import { useTheme } from '@/theme';
import type { GoalType } from '@/types/domain';

const GOALS: { value: GoalType; title: string }[] = [
  { value: 'lose', title: 'Lose weight' },
  { value: 'maintain', title: 'Maintain weight' },
  { value: 'gain', title: 'Gain weight' },
];

export default function GoalScreen() {
  const { spacing } = useTheme();
  const { form, update } = useOnboardingStore();
  const unit = form.units === 'imperial' ? 'lb' : 'kg';
  const needsPace = form.goalType === 'lose' || form.goalType === 'gain';
  const paceOptions = PACE_OPTIONS[form.units].map((rate) => ({
    value: String(rate),
    label: `${rate} ${unit}`,
  }));
  const caution = form.goalType && assessFormPace(form) === 'caution';

  return (
    <OnboardingStepLayout
      step="goal"
      title="Your goal"
      description="You can change this anytime."
      continueDisabled={!form.goalType || (needsPace && form.weeklyRate === null)}
    >
      {GOALS.map((goal) => (
        <OptionCard
          key={goal.value}
          title={goal.title}
          selected={form.goalType === goal.value}
          onPress={() => update({ goalType: goal.value })}
        />
      ))}

      {needsPace ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="muted">
            Pace per week
          </Text>
          <SegmentedControl
            accessibilityLabel="Pace per week"
            options={paceOptions}
            value={form.weeklyRate === null ? null : String(form.weeklyRate)}
            onChange={(value) => update({ weeklyRate: Number(value) })}
            wrap
          />
        </View>
      ) : null}

      {caution && form.goalType ? <CareNotice {...paceCautionCopy(form.goalType)} /> : null}

      {needsPace ? (
        <TextField
          label={`Goal weight (${unit}, optional)`}
          value={form.targetWeight}
          onChangeText={(targetWeight) => update({ targetWeight })}
          keyboardType="decimal-pad"
        />
      ) : null}
    </OnboardingStepLayout>
  );
}
