import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { buildMonthGrid, WEEKDAY_INITIALS } from '@/lib/calendar';
import { toDateKey } from '@/lib/dates';
import { useTheme } from '@/theme';

export type LoggingCalendarProps = {
  year: number;
  month: number;
  loggedDays: ReadonlySet<string>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

/**
 * Month calendar marking logged days in a single neutral color. It deliberately never colors
 * days by calories (no red/green judgment).
 */
export function LoggingCalendar({
  year,
  month,
  loggedDays,
  onPrevMonth,
  onNextMonth,
}: LoggingCalendarProps) {
  const { colors, spacing } = useTheme();
  const todayKey = toDateKey(new Date());
  const title = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={onPrevMonth}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
        </Pressable>
        <Text variant="subheading" align="center" style={{ flex: 1 }}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={onNextMonth}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.accent} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <Text key={i} variant="caption" tone="muted" align="center" style={{ flex: 1 }}>
            {d}
          </Text>
        ))}
      </View>
      {buildMonthGrid(year, month).map((week, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {week.map((day, d) => {
            if (!day) return <View key={d} style={{ flex: 1, aspectRatio: 1 }} />;
            const key = toDateKey(day);
            const logged = loggedDays.has(key);
            const isToday = key === todayKey;
            return (
              <View
                key={d}
                accessible
                accessibilityLabel={`${day.toDateString()}${logged ? ', logged' : ''}`}
                style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: logged ? colors.logged : 'transparent',
                    borderWidth: isToday ? 1.5 : 0,
                    borderColor: colors.accent,
                  }}
                >
                  <Text variant="caption" style={{ color: logged ? colors.surface : colors.text }}>
                    {day.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
