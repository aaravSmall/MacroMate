import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, Card, Screen, SegmentedControl, Text, TextField } from '@/components/ui';
import { useProfile } from '@/features/account';
import {
  buildGoalChange,
  CareNotice,
  kgToLb,
  lbToKg,
  paceCautionCopy,
  useActiveGoal,
  useChangeGoal,
} from '@/features/goals';
import { PACE_OPTIONS } from '@/features/onboarding';
import { useWeighIns } from '@/features/weighins';
import { parseNumber } from '@/lib/format';
import { useTheme } from '@/theme';
import type { Goal, GoalType, Profile, WeighIn } from '@/types/domain';

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
];

export default function ChangeGoalScreen() {
  const { data: profile } = useProfile();
  const activeGoal = useActiveGoal();
  const weighIns = useWeighIns();
  if (!profile || activeGoal.isPending || weighIns.isPending) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ActivityIndicator />
      </Screen>
    );
  }
  return (
    <ChangeGoalForm
      profile={profile}
      goal={activeGoal.data ?? null}
      weighIns={weighIns.data ?? []}
    />
  );
}

/** Mounted once the profile, goal, and weigh-ins have loaded, so it can start from them. */
function ChangeGoalForm({
  profile,
  goal: activeGoal,
  weighIns,
}: {
  profile: Profile;
  goal: Goal | null;
  weighIns: WeighIn[];
}) {
  const { spacing } = useTheme();
  const changeGoal = useChangeGoal();

  const imperial = profile.unitSystem === 'imperial';
  const unit = imperial ? 'lb' : 'kg';
  const paceOptions = PACE_OPTIONS[profile.unitSystem];

  const [goalType, setGoalType] = useState<GoalType | null>(activeGoal?.goalType ?? null);
  const [weeklyRate, setWeeklyRate] = useState<number | null>(() => {
    if (!activeGoal) return null;
    const rate = imperial ? kgToLb(activeGoal.paceKgPerWeek) : activeGoal.paceKgPerWeek;
    return paceOptions.find((o) => Math.abs(o - rate) < 0.05) ?? null;
  });
  const [targetWeight, setTargetWeight] = useState(() => {
    const kg = activeGoal?.targetWeightKg;
    if (kg === null || kg === undefined) return '';
    return String(Math.round((imperial ? kgToLb(kg) : kg) * 10) / 10);
  });

  const currentWeightKg = useMemo(() => {
    const latest = [...weighIns].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
    return latest[0]?.weightKg ?? activeGoal?.startWeightKg ?? null;
  }, [weighIns, activeGoal]);

  const target = parseNumber(targetWeight);
  const change = goalType
    ? buildGoalChange({
        profile,
        currentWeightKg,
        goalType,
        weeklyRate,
        targetWeightKg: target === null ? null : imperial ? lbToKg(target) : target,
      })
    : null;
  const needsPace = goalType === 'lose' || goalType === 'gain';

  async function save() {
    if (!change) return;
    await changeGoal.mutateAsync(change.goal);
    router.back();
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="label" tone="muted">
          Goal
        </Text>
        <SegmentedControl
          accessibilityLabel="Goal"
          options={GOAL_OPTIONS}
          value={goalType}
          onChange={(value) => setGoalType(value as GoalType)}
        />
      </View>

      {needsPace ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="muted">
            Pace per week
          </Text>
          <SegmentedControl
            accessibilityLabel="Pace per week"
            options={paceOptions.map((rate) => ({
              value: String(rate),
              label: `${rate} ${unit}`,
            }))}
            value={weeklyRate === null ? null : String(weeklyRate)}
            onChange={(value) => setWeeklyRate(Number(value))}
            wrap
          />
        </View>
      ) : null}

      {change?.pace === 'caution' && goalType ? (
        <CareNotice {...paceCautionCopy(goalType)} />
      ) : null}

      {needsPace ? (
        <TextField
          label={`Goal weight (${unit}, optional)`}
          value={targetWeight}
          onChangeText={setTargetWeight}
          keyboardType="decimal-pad"
        />
      ) : null}

      {change && !profile.numbersOff ? (
        <Card>
          <Text variant="label" tone="muted">
            Your daily target
          </Text>
          <Text variant="heading">{change.dailyTarget.target.toLocaleString('en-US')} cal</Text>
        </Card>
      ) : null}

      {!change && goalType ? (
        <Text tone="muted">Pick a pace to see your new daily target.</Text>
      ) : null}
      {changeGoal.error ? (
        <Text tone="danger">We couldn&apos;t save your goal. Please try again.</Text>
      ) : null}
      <Button title="Save goal" onPress={save} disabled={!change} loading={changeGoal.isPending} />
    </Screen>
  );
}
