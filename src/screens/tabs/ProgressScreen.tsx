import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, Screen, Text, TextField } from '@/components/ui';
import { useProfile } from '@/features/account';
import { lbToKg, useActiveGoal } from '@/features/goals';
import { LoggingCalendar, useLoggedDays, useLongestStreak, useStreak } from '@/features/logging';
import { useAddWeighIn, useWeighIns, WeightTrendChart } from '@/features/weighins';
import { toDateKey, toDateKeyInTimeZone } from '@/lib/dates';
import { formatWeight, parseNumber } from '@/lib/format';
import { useSelectedDateStore } from '@/store/selectedDateStore';
import { useTheme } from '@/theme';

/** Current and longest logging streaks, both computed on the server. Any logged day counts. */
function StreakCard() {
  const { spacing } = useTheme();
  const streak = useStreak().data ?? null;
  const longest = useLongestStreak().data ?? null;
  const days = (n: number | null) => (n === 1 ? 'day' : 'days');

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Text variant="label" tone="muted">
            Current streak
          </Text>
          <Text variant="display">{streak ?? '–'}</Text>
          <Text variant="callout" tone="muted">
            {days(streak)} in a row
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="label" tone="muted">
            Longest streak
          </Text>
          <Text variant="display">{longest ?? '–'}</Text>
          <Text variant="callout" tone="muted">
            {days(longest)}
          </Text>
        </View>
      </View>
      <Text variant="caption" tone="muted">
        Days with at least one log
      </Text>
    </Card>
  );
}

function CalendarCard() {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const fromKey = toDateKey(new Date(view.year, view.month, 1));
  const toKey = toDateKey(new Date(view.year, view.month + 1, 1));
  const logged = useLoggedDays(fromKey, toKey);
  const goToDate = useSelectedDateStore((s) => s.goToDate);

  const shift = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <Card>
      <LoggingCalendar
        year={view.year}
        month={view.month}
        loggedDays={logged.data ?? new Set()}
        onPrevMonth={() => shift(-1)}
        onNextMonth={() => shift(1)}
        onDayPress={(dateKey) => {
          goToDate(dateKey);
          router.navigate('/today');
        }}
      />
      <QueryStatus error={logged.error} onRetry={() => void logged.refetch()} />
    </Card>
  );
}

function WeightTrendCard() {
  const weighIns = useWeighIns();
  const goal = useActiveGoal().data;
  const units = useProfile().data?.unitSystem ?? 'imperial';
  return (
    <Card>
      <Text variant="subheading">Weight trend</Text>
      <QueryStatus
        loading={weighIns.isPending}
        error={weighIns.error}
        onRetry={() => void weighIns.refetch()}
      />
      {weighIns.data ? (
        <WeightTrendChart
          weighIns={weighIns.data}
          goalKg={goal?.targetWeightKg ?? null}
          units={units}
          // Focuses the weigh-in field below (same params a weigh-in reminder opens with).
          onAddFirst={() => router.setParams({ focus: 'weighin', t: String(Date.now()) })}
        />
      ) : null}
    </Card>
  );
}

function WeighInsCard() {
  const { spacing } = useTheme();
  // Opened from a weigh-in reminder: focus the input. `t` changes per tap to refocus.
  const { focus, t } = useLocalSearchParams<{ focus?: string; t?: string }>();
  const focusInput = focus === 'weighin';
  const profile = useProfile().data;
  const units = profile?.unitSystem ?? 'imperial';
  const weighIns = useWeighIns();
  const addWeighIn = useAddWeighIn();
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const value = parseNumber(weight);
    const kg = value === null ? null : units === 'imperial' ? lbToKg(value) : value;
    if (kg === null || kg <= 20 || kg >= 400) {
      setError(`Enter your weight in ${units === 'imperial' ? 'lb' : 'kg'}.`);
      return;
    }
    setError(null);
    const measuredAt = new Date();
    await addWeighIn.mutateAsync({
      weightKg: Math.round(kg * 100) / 100,
      measuredAt,
      localDate: profile
        ? toDateKeyInTimeZone(measuredAt, profile.timezone)
        : toDateKey(measuredAt),
    });
    setWeight('');
  }

  return (
    <Card>
      <Text variant="subheading">Weigh-ins</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            key={focusInput ? `focus-${t ?? ''}` : 'weight'}
            autoFocus={focusInput}
            label={`Weight (${units === 'imperial' ? 'lb' : 'kg'})`}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            error={error ?? addWeighIn.error?.message}
          />
        </View>
        <Button title="Add weigh-in" onPress={handleAdd} loading={addWeighIn.isPending} />
      </View>
      <QueryStatus
        loading={weighIns.isPending}
        error={weighIns.error}
        onRetry={() => void weighIns.refetch()}
      />
      {weighIns.data?.length === 0 ? (
        <Text variant="callout" tone="muted">
          No weigh-ins yet.
        </Text>
      ) : null}
      {weighIns.data?.map((entry, i) => (
        <View key={entry.id}>
          {i > 0 ? <Divider /> : null}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: spacing.xs,
            }}
          >
            <Text variant="callout">
              {new Date(entry.measuredAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <Text variant="callout">{formatWeight(entry.weightKg, units)}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

export default function ProgressScreen() {
  return (
    <Screen scroll>
      <Text variant="title">Progress</Text>
      <StreakCard />
      <CalendarCard />
      <WeightTrendCard />
      <WeighInsCard />
    </Screen>
  );
}
