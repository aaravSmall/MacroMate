import { useState } from 'react';
import { View } from 'react-native';

import { SegmentedControl, Text, TextField } from '@/components/ui';
import {
  type BodyStatsErrors,
  OnboardingStepLayout,
  useOnboardingStore,
  validateBodyStats,
} from '@/features/onboarding';
import { useTheme } from '@/theme';
import type { Sex, UnitSystem } from '@/types/domain';

const UNIT_OPTIONS = [
  { value: 'imperial', label: 'lb / ft' },
  { value: 'metric', label: 'kg / cm' },
] as const satisfies readonly { value: UnitSystem; label: string }[];

const SEX_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
] as const satisfies readonly { value: Sex; label: string }[];

export default function BodyStatsScreen() {
  const { spacing } = useTheme();
  const { form, update, setUnits } = useOnboardingStore();
  const [errors, setErrors] = useState<BodyStatsErrors>({});
  const imperial = form.units === 'imperial';

  return (
    <OnboardingStepLayout
      step="body-stats"
      title="About you"
      description="Used to estimate how many calories your body uses each day."
      onContinue={() => {
        const next = validateBodyStats(form);
        setErrors(next);
        return Object.keys(next).length === 0;
      }}
    >
      <SegmentedControl
        accessibilityLabel="Units"
        options={UNIT_OPTIONS}
        value={form.units}
        onChange={setUnits}
      />
      <View style={{ gap: spacing.xs }}>
        <Text variant="label" tone="muted">
          Sex
        </Text>
        <SegmentedControl
          accessibilityLabel="Sex"
          options={SEX_OPTIONS}
          value={form.sex}
          onChange={(sex) => update({ sex })}
        />
        <Text variant="caption" tone={errors.sex ? 'danger' : 'muted'}>
          {errors.sex ?? 'Used in the standard energy equation (Mifflin-St Jeor).'}
        </Text>
      </View>
      <TextField
        label="Age"
        value={form.age}
        onChangeText={(age) => update({ age })}
        keyboardType="number-pad"
        error={errors.age}
      />
      <TextField
        label={`Weight (${imperial ? 'lb' : 'kg'})`}
        value={form.weight}
        onChangeText={(weight) => update({ weight })}
        keyboardType="decimal-pad"
        error={errors.weight}
      />
      {imperial ? (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Height (ft)"
              value={form.heightFt}
              onChangeText={(heightFt) => update({ heightFt })}
              keyboardType="number-pad"
              error={errors.height}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="(in)"
              value={form.heightIn}
              onChangeText={(heightIn) => update({ heightIn })}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      ) : (
        <TextField
          label="Height (cm)"
          value={form.heightCm}
          onChangeText={(heightCm) => update({ heightCm })}
          keyboardType="decimal-pad"
          error={errors.height}
        />
      )}
    </OnboardingStepLayout>
  );
}
