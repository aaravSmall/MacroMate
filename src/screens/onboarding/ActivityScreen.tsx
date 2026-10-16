import { OnboardingStepLayout, OptionCard, useOnboardingStore } from '@/features/onboarding';
import type { ActivityLevel } from '@/types/domain';

const OPTIONS: { value: ActivityLevel; title: string; description: string }[] = [
  { value: 'sedentary', title: 'Mostly sitting', description: 'Desk job, little exercise.' },
  {
    value: 'lightly_active',
    title: 'Lightly active',
    description: 'On your feet some of the day, or light exercise 1–3 days a week.',
  },
  {
    value: 'moderately_active',
    title: 'Moderately active',
    description: 'Moderate exercise 3–5 days a week.',
  },
  {
    value: 'very_active',
    title: 'Very active',
    description: 'Hard exercise 6–7 days a week.',
  },
  {
    value: 'extra_active',
    title: 'Extra active',
    description: 'Physical job plus hard training, or training twice a day.',
  },
];

export default function ActivityScreen() {
  const { form, update } = useOnboardingStore();
  return (
    <OnboardingStepLayout
      step="activity"
      title="Activity level"
      description="On a typical day, how active are you? Workouts synced later add to your budget separately."
      continueDisabled={!form.activityLevel}
    >
      {OPTIONS.map((option) => (
        <OptionCard
          key={option.value}
          title={option.title}
          description={option.description}
          selected={form.activityLevel === option.value}
          onPress={() => update({ activityLevel: option.value })}
        />
      ))}
    </OnboardingStepLayout>
  );
}
