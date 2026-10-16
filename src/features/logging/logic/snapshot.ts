import { scaleNutrition } from '@/lib/nutrition';
import type { AnyFood, LogEntry, MealLabel } from '@/types/domain';

export type NewLogInput = {
  food: AnyFood;
  servings: number;
  loggedAt: Date;
  mealLabel: MealLabel;
};

/**
 * Builds the LogEntry a new log will become, from the food as it is right now.
 * Used for the database snapshot and for optimistic updates.
 */
export function buildLogEntry(input: NewLogInput, id: string): LogEntry {
  const { food, servings } = input;
  return {
    id,
    loggedAt: input.loggedAt.toISOString(),
    mealLabel: input.mealLabel,
    source:
      food.kind === 'food'
        ? { kind: 'food', foodId: food.id }
        : { kind: 'userFood', userFoodId: food.id },
    servings,
    foodName: food.name,
    foodBrand: food.brand,
    serving: { size: food.serving.size, unit: food.serving.unit },
    nutritionPerServing: food.nutrition,
    totals: scaleNutrition(food.nutrition, servings),
  };
}
