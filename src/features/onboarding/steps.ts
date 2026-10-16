export const ONBOARDING_STEPS = [
  'welcome',
  'body-stats',
  'activity',
  'goal',
  'motivation',
  'diet-restrictions',
  'summary',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[index + 1] ?? null;
}
