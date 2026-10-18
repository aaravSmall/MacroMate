import { round1 } from '@/lib/nutrition';
import type { DailyTotals, ExerciseEntry } from '@/types/domain';

export type DailySummary = {
  /** Daily calorie target from the user's goal (before exercise). */
  target: number;
  /** Calories eaten. */
  eaten: number;
  /** Calories burned through exercise; these add to the day's budget. */
  burned: number;
  /** `target + burned`. */
  budget: number;
  /** `budget - eaten`. Negative when over budget; the UI decides how to present that. */
  remaining: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
};

/**
 * Puts a day's totals (from the `daily_totals` view; null when nothing is logged) and exercise
 * against the calorie target. Pure.
 */
export function computeDailySummary({
  totals,
  exercise,
  target,
}: {
  totals: Pick<DailyTotals, 'calories' | 'proteinG' | 'carbsG' | 'fatG'> | null;
  exercise: readonly Pick<ExerciseEntry, 'activeCalories'>[];
  target: number;
}): DailySummary {
  const eaten = totals?.calories ?? 0;
  const proteinG = totals?.proteinG ?? 0;
  const carbsG = totals?.carbsG ?? 0;
  const fatG = totals?.fatG ?? 0;
  const burned = exercise.reduce((sum, entry) => sum + entry.activeCalories, 0);
  const budget = target + burned;

  return {
    target: round1(target),
    eaten: round1(eaten),
    burned: round1(burned),
    budget: round1(budget),
    remaining: round1(budget - eaten),
    macros: { proteinG: round1(proteinG), carbsG: round1(carbsG), fatG: round1(fatG) },
  };
}
