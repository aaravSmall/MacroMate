import { computeDailySummary } from '@/features/logging/logic/dailySummary';
import type { ExerciseEntry, LogEntry, NutritionFacts } from '@/types/domain';

function log(totals: Partial<NutritionFacts>): LogEntry {
  const facts = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, micronutrients: {}, ...totals };
  return {
    id: Math.random().toString(),
    loggedAt: '2026-10-16T12:00:00.000Z',
    mealLabel: 'lunch',
    source: null,
    servings: 1,
    foodName: 'Food',
    foodBrand: null,
    serving: { size: 1, unit: 'serving' },
    nutritionPerServing: facts,
    totals: facts,
  };
}

function exercise(caloriesBurned: number): ExerciseEntry {
  return {
    id: Math.random().toString(),
    source: 'manual',
    externalId: null,
    activityType: 'walk',
    startedAt: '2026-10-16T08:00:00.000Z',
    durationMin: 30,
    caloriesBurned,
  };
}

describe('computeDailySummary', () => {
  it('returns the full target as remaining on an empty day', () => {
    expect(computeDailySummary({ logs: [], exercise: [], target: 2000 })).toEqual({
      target: 2000,
      eaten: 0,
      burned: 0,
      budget: 2000,
      remaining: 2000,
      macros: { proteinG: 0, carbsG: 0, fatG: 0 },
    });
  });

  it('sums calories and macros across logs', () => {
    const summary = computeDailySummary({
      logs: [
        log({ calories: 300, proteinG: 20, carbsG: 30, fatG: 10 }),
        log({ calories: 450.5, proteinG: 35.5, carbsG: 40, fatG: 12.2 }),
      ],
      exercise: [],
      target: 2000,
    });
    expect(summary.eaten).toBe(750.5);
    expect(summary.remaining).toBe(1249.5);
    expect(summary.macros).toEqual({ proteinG: 55.5, carbsG: 70, fatG: 22.2 });
  });

  it('adds burned calories to the budget', () => {
    const summary = computeDailySummary({
      logs: [log({ calories: 1000 })],
      exercise: [exercise(250), exercise(150)],
      target: 1800,
    });
    expect(summary.burned).toBe(400);
    expect(summary.budget).toBe(2200);
    expect(summary.remaining).toBe(1200);
  });

  it('allows a negative remaining value when over budget', () => {
    const summary = computeDailySummary({
      logs: [log({ calories: 2300 })],
      exercise: [],
      target: 2000,
    });
    expect(summary.remaining).toBe(-300);
  });

  it('avoids floating-point noise', () => {
    const summary = computeDailySummary({
      logs: [log({ calories: 0.1, proteinG: 0.1 }), log({ calories: 0.2, proteinG: 0.2 })],
      exercise: [],
      target: 0,
    });
    expect(summary.eaten).toBe(0.3);
    expect(summary.macros.proteinG).toBe(0.3);
  });
});
