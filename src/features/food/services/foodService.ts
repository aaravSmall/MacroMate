import { getOpenFoodFactsProduct, OFF_ID_PREFIX, searchOpenFoodFacts } from '@/lib/openFoodFacts';
import { supabase } from '@/lib/supabase';
import type { Food } from '@/types/domain';

import { mapFoodRow } from './mappers';
import { buildIlikeOrFilter } from './searchFilter';

const LOCAL_LIMIT = 25;
/** Fewer local matches than this triggers the Open Food Facts fallback. */
export const MIN_LOCAL_RESULTS = 5;

export function isOpenFoodFactsResult(food: Food): boolean {
  return food.id.startsWith(OFF_ID_PREFIX);
}

/**
 * Searches our global foods table first, then tops up with Open Food Facts results when there
 * are too few local matches. OFF failures never hide local results.
 */
export async function searchFoods(
  query: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Food[]> {
  const filter = buildIlikeOrFilter(['name', 'brand'], query);
  if (!filter) return [];

  let request = supabase.from('foods').select('*').or(filter).order('name').limit(LOCAL_LIMIT);
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

  const known = new Set(local.flatMap((food) => [food.barcode, food.externalId]).filter(Boolean));
  return [...local, ...remote.filter((food) => !known.has(food.barcode))];
}

/** Gets a food by database id, or by `off:<barcode>` for an Open Food Facts result. */
export async function getFood(id: string, signal?: AbortSignal): Promise<Food | null> {
  if (id.startsWith(OFF_ID_PREFIX)) {
    return getOpenFoodFactsProduct(id.slice(OFF_ID_PREFIX.length), signal);
  }
  const { data, error } = await supabase.from('foods').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapFoodRow(data) : null;
}

/** Looks up a stored copy of an Open Food Facts product, if one has been imported. */
export async function findStoredOpenFoodFactsFood(barcode: string): Promise<Food | null> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('source', 'open_food_facts')
    .eq('external_id', barcode)
    .maybeSingle();
  if (error) throw error;
  return data ? mapFoodRow(data) : null;
}
