import type { MealLabel } from '@/types/domain';

/**
 * Meal windows in local time, as [startHour, endHour). Anything outside them is a snack.
 * These are only suggestions; the user can always change the label.
 */
export const MEAL_WINDOWS: readonly {
  label: Exclude<MealLabel, 'snack'>;
  start: number;
  end: number;
}[] = [
  { label: 'breakfast', start: 5, end: 11 },
  { label: 'lunch', start: 11, end: 15 },
  { label: 'dinner', start: 17, end: 21 },
];

/** Suggests a meal label from the local time of day. */
export function suggestMealLabel(date: Date): MealLabel {
  const hour = date.getHours() + date.getMinutes() / 60;
  return MEAL_WINDOWS.find((w) => hour >= w.start && hour < w.end)?.label ?? 'snack';
}

export const MEAL_LABELS: readonly MealLabel[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABEL_NAMES: Record<MealLabel, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
