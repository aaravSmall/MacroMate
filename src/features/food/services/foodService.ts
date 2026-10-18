import { getOpenFoodFactsProduct, OFF_ID_PREFIX, searchOpenFoodFacts } from '@/lib/openFoodFacts';
import { requireUserId, supabase } from '@/lib/supabase';
import type { Food } from '@/types/domain';

import { FOOD_SELECT, mapFoodRow, type NewFoodInput, newFoodToRow } from './mappers';
import { buildIlikeOrFilter } from './searchFilter';

const LOCAL_LIMIT = 25;
/** Fewer local matches than this triggers the Open Food Facts fallback. */
export const MIN_LOCAL_RESULTS = 5;

/**
 * Searches stored foods (public ones plus the user's own, per RLS) first, then tops up with
 * Open Food Facts results when there are too few local matches. OFF failures never hide local
 * results.
 */
export async function searchFoods(
  query: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Food[]> {
  const filter = buildIlikeOrFilter(['name', 'brand'], query);
  if (!filter) return [];

  let request = supabase
    .from('foods')
    .select(FOOD_SELECT)
    .or(filter)
    .order('name')
    .limit(LOCAL_LIMIT);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;

  const local = data.map(mapFoodRow);
  if (local.length >= MIN_LOCAL_RESULTS) return local;

  let remote: Food[] = [];
  try {
    remote = await searchOpenFoodFacts(query.trim(), { signal });
  } catch (offError) {
    if (signal?.aborted) throw offError;
    return local;
  }

  // TODO(edge-function): cache these OFF results in `foods` (source 'open_food_facts') through an
  // Edge Function running with the service role. Clients can't insert global foods, so for now
  // they stay uncached: they're shown with an `off:` id and logged with food_id = null.
  const known = new Set(local.flatMap((food) => [food.barcode, food.externalId]).filter(Boolean));
  return [...local, ...remote.filter((food) => !known.has(food.barcode))];
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

/** A stored copy of an Open Food Facts product, once the Edge Function has cached it. */
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

/** Deletes one of the user's private foods. Past logs keep their snapshot. */
export async function deleteFood(id: string): Promise<void> {
  const { error } = await supabase.from('foods').delete().eq('id', id);
  if (error) throw error;
}
