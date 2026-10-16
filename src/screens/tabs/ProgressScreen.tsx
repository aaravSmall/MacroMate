import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, Screen, Text, TextField } from '@/components/ui';
import { useProfile } from '@/features/account';
import { lbToKg } from '@/features/goals';
import { currentStreak, LoggingCalendar, useLoggedDays } from '@/features/logging';
import { useAddWeighIn, useWeighIns } from '@/features/weighins';
import { addDays, startOfLocalDay, startOfNextLocalDay } from '@/lib/dates';
import { formatWeight, parseNumber } from '@/lib/format';
import { useTheme } from '@/theme';

/** How far back the streak looks. TODO(server): compute streaks server-side to lift this cap. */
const STREAK_LOOKBACK_DAYS = 120;

function StreakCard() {
  const today = useMemo(() => new Date(), []);
  const from = useMemo(() => addDays(startOfLocalDay(today), -STREAK_LOOKBACK_DAYS), [today]);
  const to = useMemo(() => startOfNextLocalDay(today), [today]);
  const logged = useLoggedDays(from, to);
  const streak = logged.data ? currentStreak(logged.data, today) : null;

  return (
    <Card>
      <Text variant="label" tone="muted">
        Logging streak
      </Text>
      <Text variant="display">{streak ?? '–'}</Text>
      <Text variant="callout" tone="muted">
        {streak === 1 ? 'day' : 'days'} in a row with at least one log
      </Text>
    </Card>
  );
}

function CalendarCard() {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const from = useMemo(() => new Date(view.year, view.month, 1), [view]);
  const to = useMemo(() => new Date(view.year, view.month + 1, 1), [view]);
  const logged = useLoggedDays(from, to);

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
      />
      <QueryStatus error={logged.error} onRetry={() => void logged.refetch()} />
    </Card>
  );
}

function WeighInsCard() {
  const { spacing } = useTheme();
  const units = useProfile().data?.units ?? 'imperial';
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
    await addWeighIn.mutateAsync({ weightKg: Math.round(kg * 100) / 100 });
    setWeight('');
  }

  return (
    <Card>
      <Text variant="subheading">Weigh-ins</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
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
      <WeighInsCard />
    </Screen>
  );
}
