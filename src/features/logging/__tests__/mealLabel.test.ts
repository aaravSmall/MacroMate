import { suggestMealLabel } from '@/features/logging/logic/mealLabel';

const at = (hours: number, minutes = 0) => new Date(2026, 9, 16, hours, minutes);

describe('suggestMealLabel', () => {
  it.each([
    [at(5), 'breakfast'],
    [at(7, 30), 'breakfast'],
    [at(10, 59), 'breakfast'],
    [at(11), 'lunch'],
    [at(14, 59), 'lunch'],
    [at(15), 'snack'],
    [at(16, 59), 'snack'],
    [at(17), 'dinner'],
    [at(20, 59), 'dinner'],
    [at(21), 'snack'],
    [at(0), 'snack'],
    [at(4, 59), 'snack'],
  ] as const)('%s → %s', (date, expected) => {
    expect(suggestMealLabel(date)).toBe(expected);
  });
});
