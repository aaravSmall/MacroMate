import { allHabitsMet, habitProgress, MEALS_LOGGED_TARGET } from '@/features/goals/logic/habits';
import type { MealType } from '@/types/domain';

const meals = (...m: MealType[]) => new Set(m);

describe('habitProgress', () => {
  it('reports protein and meals in a stable order', () => {
    const progress = habitProgress({
      habits: ['meals_logged', 'protein'],
      proteinG: 62.4,
      proteinTargetG: 120,
      loggedMeals: meals('breakfast', 'lunch'),
    });
    expect(progress.map((p) => [p.id, p.detail, p.done])).toEqual([
      ['protein', '62 / 120 g', false],
      ['meals_logged', '2 / 3 meals', false],
    ]);
    expect(progress[0]?.fraction).toBeCloseTo(0.52, 2);
  });

  it('marks habits done and caps progress at 1', () => {
    const progress = habitProgress({
      habits: ['protein', 'meals_logged'],
      proteinG: 150,
      proteinTargetG: 120,
      loggedMeals: meals('breakfast', 'lunch', 'dinner', 'snack'),
    });
    expect(progress.every((p) => p.done && p.fraction === 1)).toBe(true);
    expect(progress[1]?.detail).toBe(`${MEALS_LOGGED_TARGET} / ${MEALS_LOGGED_TARGET} meals`);
  });

  it('only includes chosen habits, and skips protein without a target', () => {
    expect(
      habitProgress({
        habits: ['meals_logged'],
        proteinG: 0,
        proteinTargetG: 100,
        loggedMeals: meals(),
      }),
    ).toHaveLength(1);
    expect(
      habitProgress({
        habits: ['protein'],
        proteinG: 50,
        proteinTargetG: null,
        loggedMeals: meals(),
      }),
    ).toEqual([]);
  });
});

describe('allHabitsMet', () => {
  it('needs every habit done, and at least one habit', () => {
    const done = habitProgress({
      habits: ['protein', 'meals_logged'],
      proteinG: 120,
      proteinTargetG: 120,
      loggedMeals: meals('breakfast', 'lunch', 'dinner'),
    });
    expect(allHabitsMet(done)).toBe(true);
    expect(allHabitsMet([])).toBe(false);
    const partial = habitProgress({
      habits: ['protein', 'meals_logged'],
      proteinG: 120,
      proteinTargetG: 120,
      loggedMeals: meals('breakfast'),
    });
    expect(allHabitsMet(partial)).toBe(false);
  });
});
