import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatKcal, formatServing } from '@/lib/format';
import { useTheme } from '@/theme';
import type { AnyFood } from '@/types/domain';

export function FoodResultRow({ food, onPress }: { food: AnyFood; onPress: () => void }) {
  const { spacing } = useTheme();
  const details = [food.brand, formatServing(food.serving.size, food.serving.unit)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${food.name}, ${formatKcal(food.nutrition.calories)} calories per serving`}
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
      </View>
      <Text variant="callout">{formatKcal(food.nutrition.calories)}</Text>
    </Pressable>
  );
}
