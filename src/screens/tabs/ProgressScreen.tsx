import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, Screen, Text, TextField } from '@/components/ui';
import { useProfile } from '@/features/account';
import { lbToKg } from '@/features/goals';
import { LoggingCalendar, useLoggedDays, useStreak } from '@/features/logging';
import { useAddWeighIn, useWeighIns } from '@/features/weighins';
import { toDateKey, toDateKeyInTimeZone } from '@/lib/dates';
import { formatWeight, parseNumber } from '@/lib/format';
import { useTheme } from '@/theme';

/** Consecutive days with a log, ending today or yesterday (computed on the server, no cap). */
function StreakCard() {
  const streak = useStreak().data ?? null;

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
  const fromKey = toDateKey(new Date(view.year, view.month, 1));
  const toKey = toDateKey(new Date(view.year, view.month + 1, 1));
  const logged = useLoggedDays(fromKey, toKey);

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
      <WeighInsCard />
    </Screen>
  );
}
