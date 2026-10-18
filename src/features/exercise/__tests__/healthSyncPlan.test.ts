import {
  energyKcal,
  FIRST_SYNC_DAYS,
  humanizeActivity,
  planExerciseSync,
  refuelPromptFor,
  SYNC_OVERLAP_MS,
  syncWindow,
} from '@/features/exercise/logic/healthSyncPlan';
import type { ExerciseEntry } from '@/types/domain';

const now = new Date('2026-10-18T22:00:00.000Z');
const window = { from: new Date('2026-10-11T22:00:00.000Z'), to: now };
const workout = (id: string, start: string, kcal = 300) => ({
  externalId: id,
  activityType: 'Running',
  startedAt: new Date(start),
  endedAt: new Date(new Date(start).getTime() + 30 * 60_000),
  activeCalories: kcal,
});
const entry = (
  id: string,
  externalId: string | null,
  startedAt: string,
  extra: Partial<ExerciseEntry> = {},
): ExerciseEntry => ({
  id,
  source: 'apple_health',
  externalId,
  activityType: 'Running',
  startedAt,
  endedAt: startedAt,
  localDate: startedAt.slice(0, 10),
  activeCalories: 100,
  ...extra,
});

describe('syncWindow', () => {
  it('covers the last 7 days on the first sync', () => {
    const w = syncWindow(null, now);
    expect(now.getTime() - w.from.getTime()).toBe(FIRST_SYNC_DAYS * 86_400_000);
    expect(w.to).toBe(now);
  });

  it('starts before the last sync to catch late-arriving workouts', () => {
    const last = new Date('2026-10-18T12:00:00.000Z');
    expect(syncWindow(last, now).from.getTime()).toBe(last.getTime() - SYNC_OVERLAP_MS);
  });
});

describe('humanizeActivity / energyKcal', () => {
  it('names activities', () => {
    expect(humanizeActivity('running')).toBe('Running');
    expect(humanizeActivity('traditionalStrengthTraining')).toBe('Strength training');
    expect(humanizeActivity('highIntensityIntervalTraining')).toBe('HIIT');
    expect(humanizeActivity('stairClimbing')).toBe('Stair climbing');
    expect(humanizeActivity(undefined)).toBe('Workout');
  });

  it('converts energy to kcal and treats missing energy as 0', () => {
    expect(energyKcal({ unit: 'kcal', quantity: 312.456 })).toBe(312.46);
    expect(energyKcal({ unit: 'Cal', quantity: 200 })).toBe(200);
    expect(energyKcal({ unit: 'kJ', quantity: 418.4 })).toBe(100);
    expect(energyKcal(undefined)).toBe(0);
    expect(energyKcal({ unit: 'kcal', quantity: -5 })).toBe(0);
  });
});

describe('planExerciseSync', () => {
  const base = { window, userId: 'user-1', timezone: 'America/New_York' };

  it('upserts every workout in the window with source apple_health and a local date', () => {
    const plan = planExerciseSync({
      ...base,
      workouts: [workout('hk-1', '2026-10-18T01:30:00.000Z', 412.5)], // Oct 17, 9:30 pm in NY
      existing: [],
    });
    expect(plan).toEqual({
      upserts: [
        {
          user_id: 'user-1',
          source: 'apple_health',
          external_id: 'hk-1',
          activity_type: 'Running',
          started_at: '2026-10-18T01:30:00.000Z',
          ended_at: '2026-10-18T02:00:00.000Z',
          local_date: '2026-10-17',
          active_calories: 412.5,
        },
      ],
      deleteIds: [],
    });
  });

  it('updates already-synced workouts instead of duplicating (same external id)', () => {
    const plan = planExerciseSync({
      ...base,
      workouts: [workout('hk-1', '2026-10-17T12:00:00.000Z', 350)],
      existing: [entry('row-1', 'hk-1', '2026-10-17T12:00:00.000Z')],
    });
    expect(plan.upserts.map((u) => [u.external_id, u.active_calories])).toEqual([['hk-1', 350]]);
    expect(plan.deleteIds).toEqual([]);
  });

  it('deletes entries whose workout was deleted in Health, only within the window', () => {
    const plan = planExerciseSync({
      ...base,
      workouts: [workout('hk-keep', '2026-10-16T12:00:00.000Z')],
      existing: [
        entry('row-keep', 'hk-keep', '2026-10-16T12:00:00.000Z'),
        entry('row-gone', 'hk-gone', '2026-10-15T12:00:00.000Z'),
        entry('row-old', 'hk-old', '2026-09-01T12:00:00.000Z'), // outside the window: untouched
        entry('row-manual', null, '2026-10-15T12:00:00.000Z'), // no external id: untouched
      ],
    });
    expect(plan.deleteIds).toEqual(['row-gone']);
  });

  it('skips workouts that started outside the window and clamps a bad end time', () => {
    const odd = {
      ...workout('hk-odd', '2026-10-17T12:00:00.000Z'),
      endedAt: new Date('2026-10-17T11:00:00.000Z'),
    };
    const plan = planExerciseSync({
      ...base,
      workouts: [workout('hk-early', '2026-10-01T12:00:00.000Z'), odd],
      existing: [],
    });
    expect(plan.upserts.map((u) => u.external_id)).toEqual(['hk-odd']);
    expect(plan.upserts[0]?.ended_at).toBe(plan.upserts[0]?.started_at);
  });
});

describe('refuelPromptFor', () => {
  const today = '2026-10-18';
  const entries = [
    entry('a', 'hk-a', '2026-10-18T08:00:00.000Z', { endedAt: '2026-10-18T08:30:00.000Z' }),
    entry('b', 'hk-b', '2026-10-18T17:00:00.000Z', { endedAt: '2026-10-18T18:00:00.000Z' }),
    entry('c', 'hk-c', '2026-10-17T17:00:00.000Z', { localDate: '2026-10-17' }),
    entry('m', null, '2026-10-18T19:00:00.000Z', {
      source: 'manual',
      endedAt: '2026-10-18T19:30:00.000Z',
    }),
  ];

  it("picks today's most recent synced workout", () => {
    expect(refuelPromptFor(entries, today, new Set())?.id).toBe('b');
  });

  it('shows once per workout: skips dismissed ones', () => {
    expect(refuelPromptFor(entries, today, new Set(['hk-b']))?.id).toBe('a');
    expect(refuelPromptFor(entries, today, new Set(['hk-a', 'hk-b']))).toBeNull();
  });
});
