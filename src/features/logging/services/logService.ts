import {
  findStoredOpenFoodFactsFood,
  isOpenFoodFactsResult,
  createUserFood,
} from '@/features/food';
import { startOfLocalDay, startOfNextLocalDay } from '@/lib/dates';
import { nutritionFromRow, nutritionToRow, scaleNutrition } from '@/lib/nutrition';
import { requireUserId, supabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database';
import type { AnyFood, LogEntry, MealLabel } from '@/types/domain';

import type { NewLogInput } from '../logic/snapshot';

export function mapLogRow(row: Tables<'food_logs'>): LogEntry {
  const nutritionPerServing = nutritionFromRow(row);
  return {
    id: row.id,
    loggedAt: row.logged_at,
    mealLabel: row.meal_label,
    source: row.food_id
      ? { kind: 'food', foodId: row.food_id }
      : row.user_food_id
        ? { kind: 'userFood', userFoodId: row.user_food_id }
        : null,
    servings: row.servings,
    foodName: row.food_name,
    foodBrand: row.food_brand,
    serving: { size: row.serving_size, unit: row.serving_unit },
    nutritionPerServing,
    totals: scaleNutrition(nutritionPerServing, row.servings),
  };
}

/** Logs for the local calendar day containing `date`, oldest first. */
export async function getLogsForDay(date: Date): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .gte('logged_at', startOfLocalDay(date).toISOString())
    .lt('logged_at', startOfNextLocalDay(date).toISOString())
    .order('logged_at');
  if (error) throw error;
  return data.map(mapLogRow);
}

/**
 * Resolves the food a log row should reference. Open Food Facts results aren't stored in
 * `foods` yet, and clients can't insert there, so they're saved to the user's My Foods.
 * TODO(server): import OFF products into `foods` via an Edge Function instead.
 */
async function resolveLogSource(
  food: AnyFood,
): Promise<{ food_id: string } | { user_food_id: string }> {
  if (food.kind === 'userFood') return { user_food_id: food.id };
  if (!isOpenFoodFactsResult(food)) return { food_id: food.id };

  const stored = food.barcode ? await findStoredOpenFoodFactsFood(food.barcode) : null;
  if (stored) return { food_id: stored.id };

  const copy = await createUserFood({
    name: food.name,
    brand: food.brand,
    restaurant: food.restaurant,
    barcode: food.barcode,
    serving: food.serving,
    nutrition: food.nutrition,
  });
  return { user_food_id: copy.id };
}

export async function addLog(input: NewLogInput): Promise<LogEntry> {
  const userId = await requireUserId();
  const source = await resolveLogSource(input.food);
  const { food } = input;

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: userId,
      logged_at: input.loggedAt.toISOString(),
      meal_label: input.mealLabel,
      servings: input.servings,
      ...source,
      food_name: food.name,
      food_brand: food.brand,
      serving_size: food.serving.size,
      serving_unit: food.serving.unit,
      ...nutritionToRow(food.nutrition),
    })
    .select()
    .single();
  if (error) throw error;
  return mapLogRow(data);
}

export type LogUpdate = {
  servings?: number;
  loggedAt?: Date;
  mealLabel?: MealLabel;
};

export async function updateLog(id: string, update: LogUpdate): Promise<LogEntry> {
  const patch: TablesUpdate<'food_logs'> = {};
  if (update.servings !== undefined) patch.servings = update.servings;
  if (update.loggedAt !== undefined) patch.logged_at = update.loggedAt.toISOString();
  if (update.mealLabel !== undefined) patch.meal_label = update.mealLabel;

  const { data, error } = await supabase
    .from('food_logs')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapLogRow(data);
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}
