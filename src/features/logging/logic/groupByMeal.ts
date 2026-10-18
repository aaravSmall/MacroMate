import type { LogEntry, MealType } from '@/types/domain';

import { MEAL_LABELS } from './mealLabel';

/** Groups entries by meal in breakfast → snack order, skipping empty meals. */
export function groupByMeal(
  entries: readonly LogEntry[],
): { meal: MealType; entries: LogEntry[] }[] {
  return MEAL_LABELS.map((meal) => ({
    meal,
    entries: entries.filter((e) => e.meal === meal),
  })).filter((group) => group.entries.length > 0);
}
