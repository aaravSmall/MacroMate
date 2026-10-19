/**
 * Habit goals for numbers-off mode: progress toward protein and logged meals instead of
 * calories. Pure. Celebrations here are about habits being met, never about eating less.
 */
import type { HabitGoal, MealType } from '@/types/domain';

/** Meals to log for the meals_logged habit. */
export const MEALS_LOGGED_TARGET = 3;

export type HabitProgress = {
  id: HabitGoal;
  label: string;
  /** "62 / 120 g", "2 / 3 meals". */
  detail: string;
  /** 0–1 for a progress bar. */
  fraction: number;
  done: boolean;
};

const HABIT_ORDER: readonly HabitGoal[] = ['protein', 'meals_logged'];

/**
 * Progress for each chosen habit, in a stable order. Protein needs a protein target; without
 * one it's left out rather than shown as unachievable.
 */
export function habitProgress({
  habits,
  proteinG,
  proteinTargetG,
  loggedMeals,
}: {
  habits: readonly HabitGoal[];
  proteinG: number;
  proteinTargetG: number | null;
  /** Meal types with at least one entry today. */
  loggedMeals: ReadonlySet<MealType>;
}): HabitProgress[] {
  const out: HabitProgress[] = [];
  for (const id of HABIT_ORDER) {
    if (!habits.includes(id)) continue;
    if (id === 'protein') {
      if (!proteinTargetG || proteinTargetG <= 0) continue;
      const current = Math.round(proteinG);
      out.push({
        id,
        label: 'Protein',
        detail: `${current} / ${Math.round(proteinTargetG)} g`,
        fraction: Math.min(1, proteinG / proteinTargetG),
        done: proteinG >= proteinTargetG,
      });
    } else {
      const count = loggedMeals.size;
      out.push({
        id,
        label: 'Meals logged',
        detail: `${Math.min(count, MEALS_LOGGED_TARGET)} / ${MEALS_LOGGED_TARGET} meals`,
        fraction: Math.min(1, count / MEALS_LOGGED_TARGET),
        done: count >= MEALS_LOGGED_TARGET,
      });
    }
  }
  return out;
}

/** Celebrate when every shown habit is met (and there's at least one). */
export function allHabitsMet(progress: readonly HabitProgress[]): boolean {
  return progress.length > 0 && progress.every((h) => h.done);
}

export const HABIT_CELEBRATION = {
  title: 'Habits done for today',
  message: 'You hit every habit you set. Nice consistency.',
};
