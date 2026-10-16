import { groupByMeal } from '@/features/logging/logic/groupByMeal';
import type { LogEntry, MealLabel } from '@/types/domain';

const entry = (id: string, mealLabel: MealLabel): LogEntry => ({
  id,
  loggedAt: '2026-10-16T12:00:00.000Z',
  mealLabel,
  source: null,
  servings: 1,
  foodName: id,
  foodBrand: null,
  serving: { size: 1, unit: 'serving' },
  nutritionPerServing: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, micronutrients: {} },
  totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, micronutrients: {} },
});

describe('groupByMeal', () => {
  it('orders meals and keeps entry order within a meal', () => {
    const groups = groupByMeal([
      entry('a', 'snack'),
      entry('b', 'breakfast'),
      entry('c', 'dinner'),
      entry('d', 'breakfast'),
    ]);
    expect(groups.map((g) => [g.mealLabel, g.entries.map((e) => e.id)])).toEqual([
      ['breakfast', ['b', 'd']],
      ['dinner', ['c']],
      ['snack', ['a']],
    ]);
  });

  it('returns nothing for no entries', () => {
    expect(groupByMeal([])).toEqual([]);
  });
});
