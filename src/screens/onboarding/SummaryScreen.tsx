import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Button, Card, Divider, Text } from '@/components/ui';
import { useUpdateProfile } from '@/features/account';
import {
  calorieFloorRecommendation,
  CareNotice,
  paceCautionCopy,
  useChangeGoal,
} from '@/features/goals';
import {
  buildOnboardingResult,
  OnboardingStepLayout,
  useOnboardingStore,
} from '@/features/onboarding';
import { deviceTimeZone } from '@/lib/dates';
import { formatGrams, formatKcal } from '@/lib/format';
import { useTheme } from '@/theme';

export default function SummaryScreen() {
  const { spacing } = useTheme();
  const { form, reset } = useOnboardingStore();
  const result = useMemo(() => buildOnboardingResult(form, { timezone: deviceTimeZone() }), [form]);
  const changeGoal = useChangeGoal();
  const updateProfile = useUpdateProfile();
  const saving = changeGoal.isPending || updateProfile.isPending;
  const error = changeGoal.error ?? updateProfile.error;

  if (!result) {
    return (
      <OnboardingStepLayout
        step="summary"
        title="A few answers are missing"
        description="Head back and fill in your details, activity level, and goal."
        footer={<Button title="Back to start" onPress={() => router.replace('/body-stats')} />}
      />
    );
  }

  const { dailyTarget, pace, goal } = result;
  const macros = goal.macroTargets;

  async function handleFinish() {
    if (!result) return;
    try {
      // Goal first: setting onboarded_at on the profile is what lets the user into the app.
      await changeGoal.mutateAsync(result.goal);
      await updateProfile.mutateAsync({
        ...result.profileUpdate,
        onboardedAt: new Date().toISOString(),
      });
    } catch {
      return; // Shown from the mutation's error state.
    }
    reset();
    // The root gate now allows (tabs).
    router.replace('/today');
  }

  return (
    <OnboardingStepLayout
      step="summary"
      title="Your daily target"
      footer={
        <>
          {error ? <Text tone="danger">{error.message}</Text> : null}
          <Button title="Start logging" onPress={handleFinish} loading={saving} />
        </>
      }
    >
      <Card>
        <Text variant="display">{formatKcal(dailyTarget.target)}</Text>
        <Text tone="muted">calories a day</Text>
        {dailyTarget.floorApplied ? (
          <Text variant="callout">
            {calorieFloorRecommendation(dailyTarget.floor)} We&apos;ve started your target there,
            and you can adjust it anytime.
          </Text>
        ) : null}
        <View style={{ gap: spacing.xs }}>
          <Divider />
          <Text variant="callout">Protein {formatGrams(macros.proteinG ?? 0)}</Text>
          <Text variant="callout">Carbs {formatGrams(macros.carbsG ?? 0)}</Text>
          <Text variant="callout">Fat {formatGrams(macros.fatG ?? 0)}</Text>
        </View>
      </Card>
      {pace === 'caution' ? <CareNotice {...paceCautionCopy(goal.goalType)} /> : null}
      <Text variant="caption" tone="muted">
        This is an estimate from your answers, using the Mifflin-St Jeor equation and about 3,500
        calories per pound. Bodies vary, so treat it as a starting point.
      </Text>
    </OnboardingStepLayout>
  );
}
