import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { nextOnboardingStep, ONBOARDING_STEPS, type OnboardingStep } from '../steps';

export type OnboardingStepLayoutProps = {
  step: OnboardingStep;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Return false to stay on this step (e.g. validation failed). */
  onContinue?: () => boolean;
  continueLabel?: string;
  continueDisabled?: boolean;
  /** Replaces the default Continue button. */
  footer?: ReactNode;
};

export function OnboardingStepLayout({
  step,
  title,
  description,
  children,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
  footer,
}: OnboardingStepLayoutProps) {
  const { colors, radii, spacing } = useTheme();
  const index = ONBOARDING_STEPS.indexOf(step);
  const progress = (index + 1) / ONBOARDING_STEPS.length;

  function handleContinue() {
    if (onContinue && !onContinue()) return;
    const next = nextOnboardingStep(step);
    if (next) router.push(`/${next}`);
  }

  return (
    <Screen scroll>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: ONBOARDING_STEPS.length, now: index + 1 }}
        style={{ height: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted }}
      >
        <View
          style={{
            height: 4,
            width: `${progress * 100}%`,
            borderRadius: radii.pill,
            backgroundColor: colors.accent,
          }}
        />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">{title}</Text>
        {description ? <Text tone="muted">{description}</Text> : null}
      </View>
      {children}
      {footer ?? (
        <Button title={continueLabel} onPress={handleContinue} disabled={continueDisabled} />
      )}
      {index > 0 ? <Button title="Back" variant="ghost" onPress={() => router.back()} /> : null}
    </Screen>
  );
}
