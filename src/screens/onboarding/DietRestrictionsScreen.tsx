import { View } from 'react-native';

import { Text } from '@/components/ui';
import {
  ALLERGY_OPTIONS,
  DIETARY_RESTRICTION_OPTIONS,
  OnboardingStepLayout,
  OptionCard,
  useOnboardingStore,
} from '@/features/onboarding';
import { useTheme } from '@/theme';

export default function DietRestrictionsScreen() {
  const { spacing } = useTheme();
  const { form, toggleListItem } = useOnboardingStore();

  const chips = (list: 'dietaryRestrictions' | 'allergies', options: readonly string[]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => (
        <OptionCard
          key={option}
          title={option}
          multiple
          selected={form[list].includes(option)}
          onPress={() => toggleListItem(list, option)}
        />
      ))}
    </View>
  );

  return (
    <OnboardingStepLayout
      step="diet-restrictions"
      title="Diet & allergies"
      description="Optional. Choose any that apply."
    >
      <Text variant="subheading">Dietary preferences</Text>
      {chips('dietaryRestrictions', DIETARY_RESTRICTION_OPTIONS)}
      <Text variant="subheading">Allergies</Text>
      {chips('allergies', ALLERGY_OPTIONS)}
    </OnboardingStepLayout>
  );
}
