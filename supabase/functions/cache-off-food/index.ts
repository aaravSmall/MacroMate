/**
 * cache-off-food: turns an Open Food Facts product into a global row in `foods` (with servings)
 * and returns it, so the app can log it with a real food_id.
 *
 * - Callers must be signed in. verify_jwt = true (supabase/config.toml) is the platform check,
 *   but with publishable keys the gateway also admits requests that carry only the `apikey`, so
 *   the handler verifies the caller's session JWT itself (signedInUserId).
 * - Input is only `{ code }`. Nutrition is always fetched from OFF here, never taken from the
 *   client, because the row becomes a public food everyone sees.
 * - Writes use the project's secret (service role) key, which exists only in this function's
 *   environment and never in the app.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import { adminClient, corsHeaders, json } from '../_shared/admin.ts';
import { signedInUserId } from '../_shared/auth.ts';

import {
  mapOffProductToRows,
  OFF_CODE_PATTERN,
  OFF_FIELDS,
  type OffProduct,
} from './offMapping.ts';

const OFF_USER_AGENT = 'Tally/0.1.0 (https://github.com/aaravSmall/MacroMate)';
const FOOD_SELECT = '*, food_servings(*)';

async function findCached(admin: SupabaseClient, code: string) {
  const { data, error } = await admin
    .from('foods')
    .select(FOOD_SELECT)
    .eq('source', 'open_food_facts')
    .eq('external_id', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchOffProduct(code: string): Promise<OffProduct | null> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`,
    { headers: { 'User-Agent': OFF_USER_AGENT, Accept: 'application/json' } },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Food Facts request failed (${response.status}).`);
  const body = (await response.json()) as { status?: number; product?: OffProduct };
  return body.status === 1 && body.product ? body.product : null;
}

async function readCode(req: Request): Promise<string | null> {
  try {
    const body: unknown = await req.json();
    if (body && typeof body === 'object' && 'code' in body) {
      const code = (body as Record<string, unknown>).code;
      if (typeof code === 'string' && OFF_CODE_PATTERN.test(code)) return code;
    }
  } catch {
    // Not JSON: fall through to a 400.
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let admin: SupabaseClient;
  try {
    admin = adminClient();
  } catch (error) {
    console.error('cache-off-food misconfigured', error instanceof Error ? error.message : error);
    return json({ error: 'Could not save this food right now.' }, 500);
  }
  if (!(await signedInUserId(req, admin))) {
    return json({ error: 'Sign in to save foods.' }, 401);
  }

  const code = await readCode(req);
  if (!code) return json({ error: 'Send { "code": "<4–14 digit barcode>" }.' }, 400);

  try {
    const cached = await findCached(admin, code);
    if (cached) return json({ food: cached });

    const product = await fetchOffProduct(code);
    const rows = product ? mapOffProductToRows(code, product) : null;
    if (!rows) return json({ error: 'Product not found, or it has no calories per 100 g.' }, 404);

    // One transaction: the food and its servings, or nothing. If another request cached the
    // same product first, the RPC returns that food's id instead of failing.
    const { data: foodId, error: insertError } = await admin.rpc('insert_food_with_servings', {
      food: rows.food,
      servings: rows.servings,
    });
    if (insertError || typeof foodId !== 'string') throw insertError ?? new Error('No food id.');

    const { data: food, error: readError } = await admin
      .from('foods')
      .select(FOOD_SELECT)
      .eq('id', foodId)
      .single();
    if (readError) throw readError;
    return json({ food });
  } catch (error) {
    // No PII here: the only input is a barcode.
    console.error('cache-off-food failed', code, error instanceof Error ? error.message : error);
    return json({ error: 'Could not save this food right now.' }, 500);
  }
});
