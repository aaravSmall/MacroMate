import { computeDailySummary } from '@/features/logging/logic/dailySummary';

const totals = (calories: number, proteinG = 0, carbsG = 0, fatG = 0) => ({
  calories,
  proteinG,
  carbsG,
  fatG,
});
const exercise = (activeCalories: number) => ({ activeCalories });

describe('computeDailySummary', () => {
  it('returns the full target as remaining on a day with no totals row', () => {
    expect(computeDailySummary({ totals: null, exercise: [], target: 2000 })).toEqual({
      target: 2000,
      eaten: 0,
      burned: 0,
      budget: 2000,
      remaining: 2000,
      macros: { proteinG: 0, carbsG: 0, fatG: 0 },
    });
  });

  it('uses the day totals for eaten and macros', () => {
    const summary = computeDailySummary({
      totals: totals(750.5, 55.5, 70, 22.2),
      exercise: [],
      target: 2000,
    });
    expect(summary.eaten).toBe(750.5);
    expect(summary.remaining).toBe(1249.5);
    expect(summary.macros).toEqual({ proteinG: 55.5, carbsG: 70, fatG: 22.2 });
  });

  it('adds burned calories to the budget', () => {
    const summary = computeDailySummary({
      totals: totals(1000),
      exercise: [exercise(250), exercise(150)],
      target: 1800,
    });
    expect(summary.burned).toBe(400);
    expect(summary.budget).toBe(2200);
    expect(summary.remaining).toBe(1200);
  });

  it('allows a negative remaining value when over budget', () => {
    const summary = computeDailySummary({ totals: totals(2300), exercise: [], target: 2000 });
    expect(summary.remaining).toBe(-300);
  });

  it('avoids floating-point noise', () => {
    const summary = computeDailySummary({
      totals: totals(0.1 + 0.2, 0.1 + 0.2),
      exercise: [exercise(0.1), exercise(0.2)],
      target: 0,
    });
    expect(summary.eaten).toBe(0.3);
    expect(summary.burned).toBe(0.3);
    expect(summary.macros.proteinG).toBe(0.3);
  });
});
