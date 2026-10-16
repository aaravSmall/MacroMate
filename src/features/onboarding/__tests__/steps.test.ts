import { nextOnboardingStep } from '@/features/onboarding/steps';

describe('nextOnboardingStep', () => {
  it('returns the following step', () => {
    expect(nextOnboardingStep('welcome')).toBe('body-stats');
    expect(nextOnboardingStep('diet-restrictions')).toBe('summary');
  });

  it('returns null after the last step', () => {
    expect(nextOnboardingStep('summary')).toBeNull();
  });
});
