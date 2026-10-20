import { Card, Text } from '@/components/ui';
import { OnboardingStepLayout } from '@/features/onboarding';

export default function WelcomeScreen() {
  return (
    <OnboardingStepLayout
      step="welcome"
      title="Welcome to MacroMate"
      description="A free calorie tracker with every feature included."
      continueLabel="Get started"
    >
      <Card>
        <Text>
          A few quick questions will set up a daily calorie target that fits you. It takes about a
          minute, and you can change any answer later.
        </Text>
      </Card>
      <Text variant="caption" tone="muted">
        MacroMate is not medical advice. Talk to a doctor or registered dietitian before making big
        changes to your diet or weight.
      </Text>
    </OnboardingStepLayout>
  );
}
