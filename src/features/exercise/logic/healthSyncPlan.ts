import { toDateKeyInTimeZone } from '@/lib/dates';
import type { TablesInsert } from '@/types/database';
import type { ExerciseEntry } from '@/types/domain';

import type { HealthWorkout } from '../healthSync';

/** Workouts recorded late (e.g. Hevy or a watch syncing hours after) still land in the window. */
export const SYNC_OVERLAP_MS = 48 * 60 * 60 * 1000;
export const FIRST_SYNC_DAYS = 7;

/**
 * The range of workout start times to sync: since the last sync (minus an overlap for late
 * arrivals), or the last 7 days on the first sync. Deletions are detected within this window.
 */
export function syncWindow(
  lastSyncAt: Date | null,
  now: Date = new Date(),
): { from: Date; to: Date } {
  const from = lastSyncAt
    ? new Date(lastSyncAt.getTime() - SYNC_OVERLAP_MS)
    : new Date(now.getTime() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000);
  return { from, to: now };
}

const ACTIVITY_NAMES: Record<string, string> = {
  traditionalStrengthTraining: 'Strength training',
  functionalStrengthTraining: 'Functional strength training',
  highIntensityIntervalTraining: 'HIIT',
  mixedCardio: 'Cardio',
  crossTraining: 'Cross training',
  coreTraining: 'Core training',
  other: 'Workout',
};

/** "traditionalStrengthTraining" → "Strength training"; "running" → "Running". */
export function humanizeActivity(enumName: string | undefined): string {
  if (!enumName) return 'Workout';
  const known = ACTIVITY_NAMES[enumName];
  if (known) return known;
  const words = enumName.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const KJ_PER_KCAL = 4.184;

/** HealthKit energy quantity → kcal. Missing energy counts as 0 (the workout still shows). */
export function energyKcal(energy: { unit: string; quantity: number } | undefined): number {
  if (!energy || !Number.isFinite(energy.quantity) || energy.quantity < 0) return 0;
  const unit = energy.unit.toLowerCase();
  const kcal = unit === 'kj' ? energy.quantity / KJ_PER_KCAL : energy.quantity; // kcal, Cal
  return Math.round(kcal * 100) / 100;
}

type ExistingEntry = Pick<ExerciseEntry, 'id' | 'externalId' | 'startedAt'>;

export type SyncPlan = {
  upserts: TablesInsert<'exercise_entries'>[];
  /** Entries synced earlier whose workout is no longer in Health (deleted there). */
  deleteIds: string[];
};

/**
 * Diffs Health against what's stored. Every workout in the window is upserted (keyed on
 * user_id + external_id), and stored apple_health entries that started in the window but are no
 * longer in Health are deleted. `existing` must be only this user's apple_health entries.
 */
export function planExerciseSync({
  workouts,
  existing,
  window,
  userId,
  timezone,
}: {
  workouts: readonly HealthWorkout[];
  existing: readonly ExistingEntry[];
  window: { from: Date; to: Date };
  userId: string;
  timezone: string;
}): SyncPlan {
  const inWindow = (d: Date) => d >= window.from && d <= window.to;
  const healthIds = new Set(workouts.map((w) => w.externalId));

  const upserts = workouts
    .filter((w) => inWindow(w.startedAt))
    .map((w) => ({
      user_id: userId,
      source: 'apple_health' as const,
      external_id: w.externalId,
      activity_type: w.activityType,
      started_at: w.startedAt.toISOString(),
      ended_at: (w.endedAt >= w.startedAt ? w.endedAt : w.startedAt).toISOString(),
      local_date: toDateKeyInTimeZone(w.startedAt, timezone),
      active_calories: w.activeCalories,
    }));

  const deleteIds = existing
    .filter(
      (e) =>
        e.externalId !== null && !healthIds.has(e.externalId) && inWindow(new Date(e.startedAt)),
    )
    .map((e) => e.id);

  return { upserts, deleteIds };
}

/**
 * The workout to show a refuel prompt for: the most recent Apple Health workout logged today
 * that the user hasn't dismissed. One prompt per workout.
 */
export function refuelPromptFor(
  entries: readonly ExerciseEntry[],
  todayKey: string,
  dismissed: ReadonlySet<string>,
): ExerciseEntry | null {
  const candidates = entries
    .filter(
      (e) =>
        e.source === 'apple_health' &&
        e.localDate === todayKey &&
        e.externalId !== null &&
        !dismissed.has(e.externalId),
    )
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  return candidates[0] ?? null;
}
