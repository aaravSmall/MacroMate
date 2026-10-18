import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatKcal } from '@/lib/format';
import { useTheme } from '@/theme';
import type { Food } from '@/types/domain';

import {
  defaultServing,
  hasMismatchWarning,
  isUncachedOpenFoodFactsResult,
} from '../logic/foodRules';

/** Label-check counts for public foods; nothing for private or uncached foods. */
function VerificationLine({ food }: { food: Food }) {
  if (food.visibility !== 'public' || isUncachedOpenFoodFactsResult(food)) return null;
  const { verificationCount: yes, mismatchCount: no } = food;
  if (yes === 0 && no === 0) {
    return (
      <Text variant="caption" tone="muted">
        No label checks yet
      </Text>
    );
  }
  return (
    <>
      <Text variant="caption" tone="muted">
        {yes} {yes === 1 ? 'person says' : 'people say'} it matches their label · {no}{' '}
        {no === 1 ? 'says' : 'say'} it doesn&apos;t
      </Text>
      {hasMismatchWarning(food) ? (
        <Text variant="caption" tone="accent">
          Heads up: this may not match the package. Check it against your label.
        </Text>
      ) : null}
    </>
  );
}

export function FoodResultRow({ food, onPress }: { food: Food; onPress: () => void }) {
  const { spacing } = useTheme();
  const serving = defaultServing(food);
  const kcal = food.nutrition.calories * serving.baseMultiplier;
  const details = [food.brand, serving.label].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${food.name}, ${formatKcal(kcal)} calories per ${serving.label}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="callout">{food.name}</Text>
        <Text variant="caption" tone="muted">
          {details}
        </Text>
        <VerificationLine food={food} />
      </View>
      <Text variant="callout">{formatKcal(kcal)}</Text>
    </Pressable>
  );
}
