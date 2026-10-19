import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatKcal } from '@/lib/format';
import { useTheme } from '@/theme';
import type { Food } from '@/types/domain';

import { defaultServing, hasMismatchWarning, verificationSummary } from '../logic/foodRules';

/** Label-check counts ("✓ 24 · ✗ 2") for public label foods that have votes. */
export function VerificationLine({
  food,
  showWarning = true,
}: {
  food: Food;
  /** Also show the "may not match the package" heads-up when most votes say it doesn't. */
  showWarning?: boolean;
}) {
  const summary = verificationSummary(food);
  if (!summary) return null;
  return (
    <>
      <Text variant="caption" tone="muted" accessibilityLabel={summary.accessibilityLabel}>
        {summary.text}
      </Text>
      {showWarning && hasMismatchWarning(food) ? (
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
