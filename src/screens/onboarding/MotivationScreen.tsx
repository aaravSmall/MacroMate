import { TextField } from '@/components/ui';
import { OnboardingStepLayout, useOnboardingStore } from '@/features/onboarding';

export default function MotivationScreen() {
  const { form, update } = useOnboardingStore();
  return (
    <OnboardingStepLayout
      step="motivation"
      title="What brings you here?"
      description="Optional. A sentence about your why can be a helpful reminder later."
    >
      <TextField
        label="Your why"
        placeholder="e.g. Have more energy for my kids"
        value={form.motivation}
        onChangeText={(motivation) => update({ motivation })}
        multiline
        style={{ minHeight: 96, textAlignVertical: 'top' }}
      />
    </OnboardingStepLayout>
  );
}
