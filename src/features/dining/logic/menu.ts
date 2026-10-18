import type { Food, MealType } from '@/types/domain';

import type { DiningMeal } from '../types';

export type MenuRow = {
  meal: string;
  station: string;
  mealOrder: number;
  sortOrder: number;
  food: Food;
};

/** Rows (any order) → meals → stations → foods, in the provider's order. Pure. */
export function groupMenu(rows: readonly MenuRow[]): DiningMeal[] {
  const sorted = [...rows].sort((a, b) => a.mealOrder - b.mealOrder || a.sortOrder - b.sortOrder);
  const meals: DiningMeal[] = [];
  for (const row of sorted) {
    let meal = meals.find((m) => m.name === row.meal);
    if (!meal) {
      meal = { name: row.meal, stations: [] };
      meals.push(meal);
    }
    let station = meal.stations.find((s) => s.name === row.station);
    if (!station) {
      station = { name: row.station, foods: [] };
      meal.stations.push(station);
    }
    if (!station.foods.some((f) => f.id === row.food.id)) station.foods.push(row.food);
  }
  return meals;
}

/** Our meal type for a dining meal name: "Late Lunch" → lunch, "Breakfast/Lunch" → breakfast. */
export function mealTypeFor(name: string): MealType {
  const n = name.toLowerCase();
  if (n.includes('breakfast') || n.includes('brunch')) return 'breakfast';
  if (n.includes('lunch')) return 'lunch';
  if (n.includes('dinner') || n.includes('supper')) return 'dinner';
  return 'snack';
}

/** The meal to show first: the one matching the time of day, else the first. */
export function defaultMealIndex(meals: readonly { name: string }[], suggested: MealType): number {
  const index = meals.findIndex((m) => mealTypeFor(m.name) === suggested);
  return index >= 0 ? index : 0;
}
