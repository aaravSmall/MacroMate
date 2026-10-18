import type { MealType } from '@/types/domain';

/**
 * Meal windows in local time, as [startHour, endHour). Anything outside them is a snack.
 * These are only suggestions; the user can always change the label.
 */
export const MEAL_WINDOWS: readonly {
  label: Exclude<MealType, 'snack'>;
  start: number;
  end: number;
}[] = [
  { label: 'breakfast', start: 5, end: 11 },
  { label: 'lunch', start: 11, end: 15 },
  { label: 'dinner', start: 17, end: 21 },
];

/** Suggests a meal from the local time of day. The user can always change it. */
export function suggestMealType(date: Date): MealType {
  const hour = date.getHours() + date.getMinutes() / 60;
  return MEAL_WINDOWS.find((w) => hour >= w.start && hour < w.end)?.label ?? 'snack';
}

export const MEAL_LABELS: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABEL_NAMES: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
