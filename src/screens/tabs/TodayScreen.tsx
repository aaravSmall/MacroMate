import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, EmptyState, Screen, Text } from '@/components/ui';
import { useProfile } from '@/features/account';
import { exerciseDurationMin, useDayExercise } from '@/features/exercise';
import {
  assessDayStatus,
  CareNotice,
  feedbackForDayStatus,
  NEAR_GOAL_CELEBRATION,
  SNACK_IDEAS,
  UNDER_GOAL_NUDGE,
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

  const numbersOff = profile.data?.numbersOff ?? false;
  const target = goal.data?.dailyCalorieTarget ?? 0;
  const summary = computeDailySummary({
    totals: totals.data ?? null,
    exercise: exercise.data ?? [],
    target,
  });

  // Feedback only for finished days, and only celebrate landing near the goal.
  const isPastDay = dateKey < toDateKey(new Date());
  const feedback =
    isPastDay && target > 0 && (logs.data?.length ?? 0) > 0 && !numbersOff
      ? feedbackForDayStatus(
          assessDayStatus(summary.eaten, summary.budget, { isDayComplete: true }),
        )
      : 'none';

  return (
    <Screen scroll>
      <DateSwitcher />

      <SummaryCard
        summary={summary}
        macroTargets={goal.data?.macroTargets ?? { proteinG: null, carbsG: null, fatG: null }}
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
        numbersOff={numbersOff}
        itemCount={logs.data?.length ?? 0}
      />

      {feedback === 'celebrate' ? (
        <CareNotice {...NEAR_GOAL_CELEBRATION} showHelpLink={false} />
      ) : feedback === 'gentle_nudge' ? (
        <CareNotice {...UNDER_GOAL_NUDGE} showHelpLink={false}>
          {SNACK_IDEAS.slice(0, 3).map((idea) => (
            <Text key={idea.name} variant="callout" tone="muted">
              • {idea.name} (~{idea.approxCalories} cal)
            </Text>
          ))}
        </CareNotice>
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
          No exercise logged. Apple Health sync is coming soon, and burned calories will add to your
          budget.
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
