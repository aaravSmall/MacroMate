/**
 * sync-dining: pulls campus dining menus (today + the next 2 days) into foods,
 * dining_locations, and dining_menu_items. Providers live in ./providers (Purdue first).
 *
 * Only trusted callers: the daily pg_cron job (x-cron-secret) or the service-role / secret key.
 * verify_jwt is off for this function because neither carries a user JWT; the handler checks.
 *
 * Each run fetches item details only for new or stale items, within a time budget; if the budget
 * runs out it returns complete: false and the next scheduled run continues.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import { adminClient, corsHeaders, json, serviceKeys } from '../_shared/admin.ts';
import { isTrustedCaller } from '../_shared/auth.ts';
import { type MenuRow, runSync, type SyncStore } from './lib/syncCore.ts';
import { createPurdueProvider } from './providers/purdue.ts';
import type { DiningProvider, ProviderFoodRow } from './providers/types.ts';

/** Stop fetching item details after this long (Edge Functions have a wall-clock limit). */
const TIME_BUDGET_MS = 110_000;

const PROVIDERS: Record<string, () => DiningProvider> = {
  purdue: () => createPurdueProvider(),
};

const NUTRITION_COLUMNS = [
  'name',
  'calories',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'sugar_g',
  'sat_fat_g',
  'sodium_mg',
  'cholesterol_mg',
  'micros',
  'allergens',
  'diet_tags',
  'ingredients',
] as const;

function supabaseStore(db: SupabaseClient): SyncStore {
  return {
    async upsertLocations(provider, locations) {
      const { data, error } = await db
        .from('dining_locations')
        .upsert(
          locations.map((l) => ({
            provider,
            external_id: l.externalId,
            name: l.name,
            formal_name: l.formalName,
            category: l.category,
            sort_order: l.sortOrder,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'provider,external_id' },
        )
        .select('id, external_id');
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.external_id as string, r.id as string]));
    },

    async findFoods(provider, itemIds) {
      const found = new Map<string, { id: string; syncedAt: string | null }>();
      for (let i = 0; i < itemIds.length; i += 200) {
        const { data, error } = await db
          .from('foods')
          .select('id, provider_item_id, provider_synced_at')
          .eq('provider', provider)
          .in('provider_item_id', itemIds.slice(i, i + 200));
        if (error) throw error;
        for (const r of data ?? []) {
          found.set(r.provider_item_id as string, {
            id: r.id as string,
            syncedAt: r.provider_synced_at as string | null,
          });
        }
      }
      return found;
    },

    async upsertFood(food: ProviderFoodRow, servings) {
      const { data: before } = await db
        .from('foods')
        .select(NUTRITION_COLUMNS.join(','))
        .eq('provider', food.provider)
        .eq('provider_item_id', food.provider_item_id)
        .maybeSingle();
      const { data: id, error } = await db.rpc('upsert_provider_food', { food, servings });
      if (error || typeof id !== 'string') throw error ?? new Error('No food id.');
      const changed =
        !!before &&
        NUTRITION_COLUMNS.some(
          (c) => JSON.stringify((before as Record<string, unknown>)[c]) !== JSON.stringify(food[c]),
        );
      return { id, changed };
    },

    async syncMenu(locationId, date, rows: MenuRow[], mode) {
      const { data: existing, error } = await db
        .from('dining_menu_items')
        .select('id, meal, station, food_id, meal_order, sort_order')
        .eq('location_id', locationId)
        .eq('served_on', date);
      if (error) throw error;
      const key = (meal: string, station: string, foodId: string) => `${meal}|${station}|${foodId}`;
      const current = new Map((existing ?? []).map((r) => [key(r.meal, r.station, r.food_id), r]));
      const diff = { inserted: 0, deleted: 0, reordered: 0, unchanged: 0 };

      const toInsert = [];
      for (const row of rows) {
        const found = current.get(key(row.meal, row.station, row.foodId));
        if (!found) {
          toInsert.push({
            location_id: locationId,
            served_on: date,
            meal: row.meal,
            station: row.station,
            food_id: row.foodId,
            meal_order: row.mealOrder,
            sort_order: row.sortOrder,
          });
          continue;
        }
        current.delete(key(row.meal, row.station, row.foodId));
        if (found.meal_order !== row.mealOrder || found.sort_order !== row.sortOrder) {
          const { error: e } = await db
            .from('dining_menu_items')
            .update({
              meal_order: row.mealOrder,
              sort_order: row.sortOrder,
              synced_at: new Date().toISOString(),
            })
            .eq('id', found.id);
          if (e) throw e;
          diff.reordered += 1;
        } else {
          diff.unchanged += 1;
        }
      }
      if (toInsert.length) {
        const { error: e } = await db.from('dining_menu_items').insert(toInsert);
        if (e) throw e;
        diff.inserted = toInsert.length;
      }
      // Off the menu now: remove the menu row (never the food: past logs may reference it).
      if (mode === 'replace' && current.size > 0) {
        const { error: e } = await db
          .from('dining_menu_items')
          .delete()
          .in(
            'id',
            [...current.values()].map((r) => r.id),
          );
        if (e) throw e;
        diff.deleted = current.size;
      }
      return diff;
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  if (
    !isTrustedCaller(req, {
      serviceKeys: serviceKeys(),
      cronSecret: Deno.env.get('DINING_CRON_SECRET') ?? null,
    })
  ) {
    return json({ error: 'Not allowed.' }, 401);
  }

  const started = Date.now();
  let requested: string[] = Object.keys(PROVIDERS);
  try {
    const body: unknown = await req.json();
    if (
      body &&
      typeof body === 'object' &&
      Array.isArray((body as { providers?: unknown }).providers)
    ) {
      requested = (body as { providers: unknown[] }).providers.filter(
        (p): p is string => typeof p === 'string',
      );
    }
  } catch {
    // No body: sync every provider.
  }

  try {
    const store = supabaseStore(adminClient());
    const results = [];
    for (const id of requested) {
      const make = PROVIDERS[id];
      if (!make) continue;
      results.push(await runSync({ provider: make(), store, deadline: started + TIME_BUDGET_MS }));
    }
    console.log(
      'sync-dining',
      JSON.stringify(results.map((r) => ({ ...r, errors: r.errors.length }))),
    );
    return json({ results, ms: Date.now() - started });
  } catch (error) {
    console.error('sync-dining failed', error instanceof Error ? error.message : error);
    return json({ error: 'Sync failed.' }, 500);
  }
});
