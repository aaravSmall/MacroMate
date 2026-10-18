/**
 * cache-off-food: turns an Open Food Facts product into a global row in `foods` (with servings)
 * and returns it, so the app can log it with a real food_id.
 *
 * - Callers must be signed in. verify_jwt = true (supabase/config.toml) is the platform check,
 *   but with publishable keys the gateway also admits requests that carry only the `apikey`, so
 *   the handler verifies the caller's session JWT itself (requireSignedInUser).
 * - Input is only `{ code }`. Nutrition is always fetched from OFF here, never taken from the
 *   client, because the row becomes a public food everyone sees.
 * - Writes use the project's secret (service role) key, which exists only in this function's
 *   environment and never in the app.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import {
  mapOffProductToRows,
  OFF_CODE_PATTERN,
  OFF_FIELDS,
  type OffProduct,
} from './offMapping.ts';

const OFF_USER_AGENT = 'Tally/0.1.0 (https://github.com/aaravSmall/MacroMate)';
const FOOD_SELECT = '*, food_servings(*)';
const UNIQUE_VIOLATION = '23505';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** The secret key: new-style `SUPABASE_SECRET_KEYS` (JSON, "default"), else the legacy one. */
function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed: unknown = JSON.parse(keys);
    if (parsed && typeof parsed === 'object' && 'default' in parsed) {
      const key = (parsed as Record<string, unknown>).default;
      if (typeof key === 'string' && key) return key;
    }
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legacy) throw new Error('No secret key in the function environment.');
  return legacy;
}

function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL is not set.');
  return createClient(url, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True when the request carries a valid session JWT for a signed-in (not anon) user. */
async function requireSignedInUser(req: Request, admin: SupabaseClient): Promise<boolean> {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization') ?? '');
  const token = match?.[1];
  // Publishable/secret keys aren't JWTs; only a user's session token is accepted.
  if (!token || token.startsWith('sb_')) return false;
  const { data, error } = await admin.auth.getClaims(token);
  const claims = data?.claims;
  return !error && claims?.role === 'authenticated' && typeof claims.sub === 'string';
}

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
  if (!(await requireSignedInUser(req, admin))) {
    return json({ error: 'Sign in to save foods.' }, 401);
  }

  const code = await readCode(req);
  if (!code) return json({ error: 'Send { "code": "<4–14 digit barcode>" }.' }, 400);

  try {
    const cached = await findCached(admin, code);
    if (cached) return json({ food: cached, created: false });

    const product = await fetchOffProduct(code);
    const rows = product ? mapOffProductToRows(code, product) : null;
    if (!rows) return json({ error: 'Product not found, or it has no calories per 100 g.' }, 404);

    const { data: inserted, error: insertError } = await admin
      .from('foods')
      .insert(rows.food)
      .select('id')
      .single();
    if (insertError) {
      // Someone cached the same product at the same moment: return their row.
      if (insertError.code === UNIQUE_VIOLATION) {
        const existing = await findCached(admin, code);
        if (existing) return json({ food: existing, created: false });
      }
      throw insertError;
    }

    const { error: servingsError } = await admin
      .from('food_servings')
      .insert(rows.servings.map((serving) => ({ ...serving, food_id: inserted.id })));
    if (servingsError) {
      // Don't leave a global food without portions; the next call will retry from scratch.
      await admin.from('foods').delete().eq('id', inserted.id);
      throw servingsError;
    }

    const food = await findCached(admin, code);
    return json({ food, created: true }, 201);
  } catch (error) {
    // No PII here: the only input is a barcode.
    console.error('cache-off-food failed', code, error instanceof Error ? error.message : error);
    return json({ error: 'Could not save this food right now.' }, 500);
  }
});
