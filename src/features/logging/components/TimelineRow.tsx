import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatKcal, formatTime } from '@/lib/format';
import { useTheme } from '@/theme';
import type { LogEntry } from '@/types/domain';

export type TimelineRowProps = {
  entry: LogEntry;
  onPress: () => void;
  showCalories: boolean;
};

/** "time | full item name | calories". The name is never truncated. */
export function TimelineRow({ entry, onPress, showCalories }: TimelineRowProps) {
  const { spacing } = useTheme();
  const pending = entry.id.startsWith('optimistic-');
  const time = formatTime(entry.loggedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${time}, ${entry.foodName}${
        showCalories ? `, ${formatKcal(entry.totals.calories)} calories` : ''
      }`}
      disabled={pending}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        opacity: pending ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Text variant="callout" tone="muted" style={{ width: 72 }}>
        {time}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="callout">{entry.foodName}</Text>
        {entry.servings !== 1 ? (
          <Text variant="caption" tone="muted">
            {entry.servings} servings
          </Text>
        ) : null}
      </View>
      {showCalories ? (
        <Text variant="callout" style={{ minWidth: 48, textAlign: 'right' }}>
          {formatKcal(entry.totals.calories)}
        </Text>
      ) : null}
    </Pressable>
  );
}
