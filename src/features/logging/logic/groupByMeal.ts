import type { LogEntry, MealLabel } from '@/types/domain';

import { MEAL_LABELS } from './mealLabel';

/** Groups entries by meal label in breakfast → snack order, skipping empty meals. */
export function groupByMeal(
  entries: readonly LogEntry[],
): { mealLabel: MealLabel; entries: LogEntry[] }[] {
  return MEAL_LABELS.map((mealLabel) => ({
    mealLabel,
    entries: entries.filter((e) => e.mealLabel === mealLabel),
  })).filter((group) => group.entries.length > 0);
}
