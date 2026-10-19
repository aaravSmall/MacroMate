import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { conflictBadge, type DietaryPrefs, foodConflicts } from '@/lib/dietary';
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

/**
 * Flags a likely conflict with the user's allergies or restrictions. Only ever a warning: no
 * badge doesn't mean safe (allergen data is often missing), and results are never hidden.
 */
export function DietaryBadge({ food, prefs }: { food: Food; prefs: DietaryPrefs }) {
  const { colors, radii, spacing } = useTheme();
  const badge = conflictBadge(foodConflicts(food, prefs));
  if (!badge) return null;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radii.sm,
        backgroundColor: colors.accentMuted,
      }}
    >
      <Text variant="caption" accessibilityLabel={`Heads up: ${badge}. Check the label.`}>
        ⚠︎ {badge}
      </Text>
    </View>
  );
}

export function FoodResultRow({
  food,
  onPress,
  prefs,
}: {
  food: Food;
  onPress: () => void;
  /** The user's allergies and restrictions, for the warning badge. */
  prefs?: DietaryPrefs;
}) {
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
        {prefs ? <DietaryBadge food={food} prefs={prefs} /> : null}
      </View>
      <Text variant="callout">{formatKcal(kcal)}</Text>
    </Pressable>
  );
}
