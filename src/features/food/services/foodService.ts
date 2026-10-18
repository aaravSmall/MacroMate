import { getOpenFoodFactsProduct, OFF_ID_PREFIX, searchOpenFoodFacts } from '@/lib/openFoodFacts';
import { requireUserId, supabase } from '@/lib/supabase';
import type { Food } from '@/types/domain';

import {
  FOOD_SELECT,
  foodEditToRow,
  type FoodRowWithServings,
  mapFoodRow,
  type NewFoodInput,
  newFoodToRow,
} from './mappers';
import { buildTermFilters, rankFoods } from './searchFilter';

const LOCAL_LIMIT = 50;
/** Fewer local matches than this triggers the Open Food Facts fallback. */
export const MIN_LOCAL_RESULTS = 5;

/**
 * Searches stored foods first: public ones (including Open Food Facts products already cached
 * by any user, with their label-check counts) plus the user's own, per RLS. Tops up with live
 * Open Food Facts results when there are too few local matches, skipping products that are
 * already cached. OFF failures never hide local results.
 */
export async function searchFoods(
  query: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Food[]> {
  // Every word must match the name or brand, in any order ("wingstop lemon pepper").
  const filters = buildTermFilters(['name', 'brand'], query);
  if (filters.length === 0) return [];

  let request = supabase.from('foods').select(FOOD_SELECT);
  for (const filter of filters) request = request.or(filter);
  let limited = request.order('name').limit(LOCAL_LIMIT);
  if (signal) limited = limited.abortSignal(signal);
  const { data, error } = await limited;
  if (error) throw error;

  const local = rankFoods(query, data.map(mapFoodRow));
  if (local.length >= MIN_LOCAL_RESULTS) return local;

  let remote: Food[] = [];
  try {
    remote = await searchOpenFoodFacts(query.trim(), { signal });
  } catch (offError) {
    if (signal?.aborted) throw offError;
    return local;
  }

  // Live OFF results have an `off:` id until they're cached (see cacheOpenFoodFactsFood).
  const cached = new Set(
    local.filter((food) => food.source === 'open_food_facts').map((food) => food.externalId),
  );
  return [...local, ...remote.filter((food) => !cached.has(food.externalId))];
}

/** Gets a food by database id, or by `off:<barcode>` for an Open Food Facts result. */
export async function getFood(id: string, signal?: AbortSignal): Promise<Food | null> {
  if (id.startsWith(OFF_ID_PREFIX)) {
    const barcode = id.slice(OFF_ID_PREFIX.length);
    const stored = await findStoredOpenFoodFactsFood(barcode);
    return stored ?? getOpenFoodFactsProduct(barcode, signal);
  }
  const { data, error } = await supabase
    .from('foods')
    .select(FOOD_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapFoodRow(data) : null;
}

/** A cached copy of an Open Food Facts product, if any user has logged it before. */
export async function findStoredOpenFoodFactsFood(barcode: string): Promise<Food | null> {
  const { data, error } = await supabase
    .from('foods')
    .select(FOOD_SELECT)
    .eq('source', 'open_food_facts')
    .eq('external_id', barcode)
    .maybeSingle();
  if (error) throw error;
  return data ? mapFoodRow(data) : null;
}

/** Thrown when an Open Food Facts product can't be cached; the message is safe to show. */
export class CacheFoodError extends Error {}

function cacheErrorMessage(status: number | undefined): string {
  if (status === 404) return "We couldn't find nutrition info for this product.";
  if (status === 400) return "This product's barcode doesn't look right.";
  return "We couldn't save this food right now. Check your connection and try again.";
}

/** The HTTP status of a functions.invoke error, when it carries the response. */
function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'context' in error) {
    const context: unknown = error.context;
    if (context instanceof Response) return context.status;
  }
  return undefined;
}

/**
 * Turns an Open Food Facts product into a global food via the `cache-off-food` Edge Function,
 * which fetches the nutrition from OFF itself and inserts it with the service role. Returns the
 * stored food (existing or new), with its servings.
 */
export async function cacheOpenFoodFactsFood(code: string): Promise<Food> {
  const { data, error } = await supabase.functions.invoke<{ food: FoodRowWithServings }>(
    'cache-off-food',
    { body: { code } },
  );
  if (error || !data?.food) throw new CacheFoodError(cacheErrorMessage(errorStatus(error)));
  return mapFoodRow(data.food);
}

/** Creates a private food owned by the user, with its servings. */
export async function createFood(input: NewFoodInput): Promise<Food> {
  const userId = await requireUserId();
  const { data: food, error } = await supabase
    .from('foods')
    .insert(newFoodToRow(input, userId))
    .select('id')
    .single();
  if (error) throw error;

  const { error: servingsError } = await supabase.from('food_servings').insert(
    input.servings.map((serving) => ({
      food_id: food.id,
      label: serving.label,
      base_multiplier: serving.baseMultiplier,
      is_default: serving.isDefault,
    })),
  );
  if (servingsError) {
    // Don't leave a food without its portions behind. It's private, so the user can delete it.
    await supabase.from('foods').delete().eq('id', food.id);
    throw servingsError;
  }

  const created = await getFood(food.id);
  if (!created) throw new Error('Could not load the food you just created.');
  return created;
}

/**
 * Saves edits to one of the user's recipes (only `user_recipe` foods are editable; RLS enforces
 * it). Updates the food's nutrition and its default serving. Past log entries are unaffected:
 * each entry stores its own snapshot. If the recipe is public, a trigger resets its label checks.
 */
export async function updateFood(food: Food, input: NewFoodInput): Promise<Food> {
  // Products keep their label values. RLS blocks the food update anyway, but it would still let
  // an owner relabel a private product's servings, so refuse before touching anything.
  if (food.source !== 'user_recipe') {
    throw new Error('Only meals you made can be edited.');
  }
  const { data: updatedRows, error } = await supabase
    .from('foods')
    .update(foodEditToRow(input))
    .eq('id', food.id)
    .select('id');
  if (error) throw error;
  // RLS filters rows instead of erroring: no row means it isn't the user's recipe.
  if (updatedRows.length === 0) throw new Error('Only meals you made can be edited.');

  const serving = input.servings.find((s) => s.isDefault) ?? input.servings[0];
  const current = food.servings.find((s) => s.isDefault && s.id !== null);
  if (serving) {
    const { error: servingError } = current?.id
      ? await supabase
          .from('food_servings')
          .update({ label: serving.label, base_multiplier: serving.baseMultiplier })
          .eq('id', current.id)
      : await supabase.from('food_servings').insert({
          food_id: food.id,
          label: serving.label,
          base_multiplier: serving.baseMultiplier,
          is_default: true,
        });
    if (servingError) throw servingError;
  }

  const updated = await getFood(food.id);
  if (!updated) throw new Error('Could not load the food you just saved.');
  return updated;
}

/** Deletes one of the user's private foods. Past logs keep their snapshot. */
export async function deleteFood(id: string): Promise<void> {
  const { error } = await supabase.from('foods').delete().eq('id', id);
  if (error) throw error;
}
