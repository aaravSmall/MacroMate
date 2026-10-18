import { nutritionToLogRow, scaleNutrition } from '@/lib/nutrition';
import { OFF_ID_PREFIX } from '@/lib/openFoodFacts';
import type { TablesInsert } from '@/types/database';
import type { Food, FoodServing, LogEntry, MealType, NutritionFacts } from '@/types/domain';

export type NewLogInput = {
  food: Food;
  serving: FoodServing;
  quantity: number;
  loggedAt: Date;
  /** `YYYY-MM-DD` of loggedAt in the user's timezone. */
  localDate: string;
  meal: MealType;
};

/** Nutrition for `quantity` of `serving`: food value × serving.baseMultiplier × quantity. */
export function portionNutrition(
  food: Pick<Food, 'nutrition'>,
  serving: Pick<FoodServing, 'baseMultiplier'>,
  quantity: number,
): NutritionFacts {
  return scaleNutrition(food.nutrition, serving.baseMultiplier * quantity);
}

/**
 * The `log_entries` row for a new log, with the snapshot computed now so later edits to the food
 * never change past logs. The food must be stored: cache Open Food Facts results first.
 */
export function buildLogInsert(input: NewLogInput, userId: string): TablesInsert<'log_entries'> {
  const { food, serving, quantity } = input;
  if (food.id.startsWith(OFF_ID_PREFIX)) {
    throw new Error('Cache this Open Food Facts product before logging it.');
  }
  return {
    user_id: userId,
    food_id: food.id,
    serving_id: serving.id,
    quantity,
    logged_at: input.loggedAt.toISOString(),
    local_date: input.localDate,
    meal: input.meal,
    food_name: food.brand ? `${food.name} (${food.brand})` : food.name,
    ...nutritionToLogRow(portionNutrition(food, serving, quantity)),
  };
}

/** The LogEntry a new log will become. Used for optimistic updates. */
export function buildLogEntry(input: NewLogInput, id: string): LogEntry {
  const row = buildLogInsert(input, '');
  return {
    id,
    loggedAt: input.loggedAt.toISOString(),
    localDate: input.localDate,
    meal: input.meal,
    foodId: row.food_id ?? null,
    servingId: row.serving_id ?? null,
    quantity: input.quantity,
    foodName: row.food_name,
    totals: portionNutrition(input.food, input.serving, input.quantity),
  };
}

/** Snapshot totals for a new quantity of the same portion. */
export function rescaleTotals(
  totals: NutritionFacts,
  fromQuantity: number,
  toQuantity: number,
): NutritionFacts {
  return scaleNutrition(totals, toQuantity / fromQuantity);
}
