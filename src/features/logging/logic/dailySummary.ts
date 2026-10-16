import { round1 } from '@/lib/nutrition';
import type { ExerciseEntry, LogEntry } from '@/types/domain';

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

/** Totals a day's logs and exercise against the calorie target. Pure. */
export function computeDailySummary({
  logs,
  exercise,
  target,
}: {
  logs: readonly LogEntry[];
  exercise: readonly ExerciseEntry[];
  target: number;
}): DailySummary {
  let eaten = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  for (const log of logs) {
    eaten += log.totals.calories;
    proteinG += log.totals.proteinG;
    carbsG += log.totals.carbsG;
    fatG += log.totals.fatG;
  }
  const burned = exercise.reduce((sum, entry) => sum + entry.caloriesBurned, 0);
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
