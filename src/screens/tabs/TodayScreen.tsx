import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, EmptyState, Screen, Text } from '@/components/ui';
import { useProfile } from '@/features/account';
import {
  exerciseDurationMin,
  RefuelCard,
  refuelPromptFor,
  useDayExercise,
  useDismissRefuel,
  useHealthConnection,
  useSyncHealth,
} from '@/features/exercise';
import {
  allHabitsMet,
  DayFeedbackCard,
  endOfDayFeedback,
  HABIT_CELEBRATION,
  habitProgress,
  useActiveGoal,
} from '@/features/goals';
import {
  computeDailySummary,
  groupByMeal,
  MEAL_LABEL_NAMES,
  SummaryCard,
  TimelineRow,
  useDailyTotals,
  useDayLogs,
} from '@/features/logging';
import { fromDateKey, toDateKey } from '@/lib/dates';
import { formatDayLabel, formatKcal, formatTime } from '@/lib/format';
import { useSelectedDateStore } from '@/store/selectedDateStore';
import { useTheme } from '@/theme';

function DateSwitcher() {
  const { colors, spacing } = useTheme();
  const { dateKey, goToPreviousDay, goToNextDay, goToToday } = useSelectedDateStore();
  const isToday = dateKey === toDateKey(new Date());
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        onPress={goToPreviousDay}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={24} color={colors.accent} />
      </Pressable>
      <Text variant="title" style={{ flex: 1 }} align="center">
        {formatDayLabel(fromDateKey(dateKey))}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next day"
        onPress={goToNextDay}
        hitSlop={12}
      >
        <Ionicons name="chevron-forward" size={24} color={colors.accent} />
      </Pressable>
      {!isToday ? <Button title="Today" variant="ghost" onPress={goToToday} /> : null}
    </View>
  );
}

export default function TodayScreen() {
  const { spacing } = useTheme();
  const dateKey = useSelectedDateStore((s) => s.dateKey);
  const [expanded, setExpanded] = useState(false);

  const profile = useProfile();
  const goal = useActiveGoal();
  const logs = useDayLogs(dateKey);
  const totals = useDailyTotals(dateKey);
  const exercise = useDayExercise(dateKey);
  const health = useHealthConnection();
  const syncHealth = useSyncHealth();
  const dismissRefuel = useDismissRefuel();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await syncHealth.mutateAsync().catch(() => null);
      await Promise.all([logs.refetch(), totals.refetch(), exercise.refetch(), goal.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const numbersOff = profile.data?.numbersOff ?? false;
  const target = goal.data?.dailyCalorieTarget ?? 0;
  const summary = computeDailySummary({
    totals: totals.data ?? null,
    exercise: exercise.data ?? [],
    target,
  });

  // Numbers-off: habits replace calorie progress, and meeting them all is what's celebrated.
  const habits = numbersOff
    ? habitProgress({
        habits: profile.data?.habitGoals ?? [],
        proteinG: summary.macros.proteinG,
        proteinTargetG: goal.data?.macroTargets.proteinG ?? null,
        loggedMeals: new Set((logs.data ?? []).map((entry) => entry.meal)),
      })
    : [];

  // Past days, or today after 7pm. Only landing near the goal is celebrated.
  const now = new Date();
  const feedback = numbersOff
    ? allHabitsMet(habits)
      ? 'celebrate'
      : 'none'
    : endOfDayFeedback({
        eaten: summary.eaten,
        target: summary.budget,
        dateKey,
        todayKey: toDateKey(now),
        localHour: now.getHours(),
        hasLogs: (logs.data?.length ?? 0) > 0,
      });
  const dietaryPrefs = {
    allergies: profile.data?.allergies ?? [],
    restrictions: profile.data?.dietaryRestrictions ?? [],
  };

  const isToday = dateKey === toDateKey(new Date());
  const refuel =
    isToday && exercise.data
      ? refuelPromptFor(exercise.data, dateKey, new Set(health.data?.dismissedRefuel ?? []))
      : null;

  return (
    <Screen scroll refreshing={refreshing} onRefresh={() => void handleRefresh()}>
      <DateSwitcher />

      <SummaryCard
        summary={summary}
        macroTargets={goal.data?.macroTargets ?? { proteinG: null, carbsG: null, fatG: null }}
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
        numbersOff={numbersOff}
        itemCount={logs.data?.length ?? 0}
        habits={habits}
      />

      <DayFeedbackCard
        feedback={feedback}
        prefs={dietaryPrefs}
        celebration={numbersOff ? HABIT_CELEBRATION : undefined}
      />

      {refuel ? (
        <RefuelCard
          workout={refuel}
          numbersOff={numbersOff}
          prefs={dietaryPrefs}
          onLogFood={() => router.navigate('/add')}
          onDone={() => refuel.externalId && dismissRefuel.mutate(refuel.externalId)}
        />
      ) : null}

      <Text variant="heading">Food</Text>
      <QueryStatus
        loading={logs.isPending}
        error={logs.error}
        onRetry={() => void logs.refetch()}
      />
      {logs.data && logs.data.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="Nothing logged yet"
          description="Search, create, or scan a food to add it here."
          actionLabel="Add food"
          onAction={() => router.navigate('/add')}
        />
      ) : null}
      {logs.data && logs.data.length > 0 ? (
        <Card>
          {groupByMeal(logs.data).map((group, index) => (
            <View key={group.meal} style={{ gap: spacing.xxs }}>
              {index > 0 ? <Divider style={{ marginVertical: spacing.sm }} /> : null}
              <Text variant="label" tone="muted">
                {MEAL_LABEL_NAMES[group.meal]}
              </Text>
              {group.entries.map((entry) => (
                <TimelineRow
                  key={entry.id}
                  entry={entry}
                  showCalories={!numbersOff}
                  onPress={() =>
                    router.push({ pathname: '/log-entry/[id]', params: { id: entry.id } })
                  }
                />
              ))}
            </View>
          ))}
        </Card>
      ) : null}

      <Text variant="heading">Exercise</Text>
      <QueryStatus
        loading={exercise.isPending}
        error={exercise.error}
        onRetry={() => void exercise.refetch()}
      />
      {exercise.data && exercise.data.length === 0 ? (
        <Text variant="callout" tone="muted">
          {health.data?.connected
            ? 'No workouts yet. Workouts from Apple Health show up here, and the calories you burn add to your budget. Pull down to sync.'
            : 'No workouts yet. Connect Apple Health in Settings to bring in workouts from your watch and apps.'}
        </Text>
      ) : null}
      {exercise.data && exercise.data.length > 0 ? (
        <Card>
          {exercise.data.map((entry) => (
            <View
              key={entry.id}
              style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs }}
            >
              <Text variant="callout" tone="muted" style={{ width: 72 }}>
                {formatTime(entry.startedAt)}
              </Text>
              <Text variant="callout" style={{ flex: 1 }}>
                {entry.activityType} · {exerciseDurationMin(entry)} min
              </Text>
              {!numbersOff ? (
                <Text variant="callout">{formatKcal(entry.activeCalories)}</Text>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
