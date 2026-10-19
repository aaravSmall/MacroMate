/**
 * Upload: upserts reviewed items from output/<chain>.json into foods + food_servings
 * (source 'restaurant', public, no owner), keyed on (source, external_id) so re-running updates
 * rows instead of duplicating them. Flagged items are skipped unless "approved": true.
 *
 * Every item must have calories, protein, carbs, and fat and at least one serving in a standard
 * unit (g, oz, ml, cups, pieces); items that don't are never uploaded, even when approved.
 * A sample of 10 items per chain is printed before anything is written.
 *
 * Dry run unless --yes. Needs a service-role/secret key in scripts/restaurants/.env.local
 * (gitignored; never commit it):
 *   SUPABASE_URL=https://<ref>.supabase.co
 *   SUPABASE_SECRET_KEY=sb_secret_…      (or SUPABASE_SERVICE_ROLE_KEY=…)
 *
 * Usage: npm run restaurants:upload -- wingstop [chipotle …] [--yes]
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

import type { NormalizedItem } from './lib/normalize';
import { uploadBlockers } from './lib/validate';

const HERE = dirname(fileURLToPath(import.meta.url));

function loadEnv(): Record<string, string> {
  const file = join(HERE, '.env.local');
  const env: Record<string, string> = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '');
    }
  }
  return {
    ...env,
    ...Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => !!e[1])),
  };
}

type Output = {
  chain: string;
  name: string;
  items: NormalizedItem[];
  flagged: (NormalizedItem & { approved?: boolean })[];
};

const args = process.argv.slice(2);
const write = args.includes('--yes');
const chains = args.filter((a) => !a.startsWith('--'));
if (chains.length === 0) {
  console.error('Usage: npm run restaurants:upload -- <chain> [<chain> …] [--yes]');
  process.exit(1);
}

const env = loadEnv();
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY in scripts/restaurants/.env.local.');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(
  `${write ? 'UPLOADING to' : 'Dry run against'} ${url}${write ? '' : ' (pass --yes to write)'}`,
);

async function upsertItem(item: NormalizedItem): Promise<'inserted' | 'updated'> {
  const { data: existing, error } = await admin
    .from('foods')
    .select('id, food_servings(id, label)')
    .eq('source', 'restaurant')
    .eq('external_id', item.externalId)
    .maybeSingle();
  if (error) throw error;
  if (!write) return existing ? 'updated' : 'inserted';

  if (!existing) {
    const { error: rpcError } = await admin.rpc('insert_food_with_servings', {
      food: item.food,
      servings: item.servings,
    });
    if (rpcError) throw rpcError;
    return 'inserted';
  }

  const { external_id: _key, source: _source, owner_id: _owner, ...changes } = item.food;
  const { error: updateError } = await admin.from('foods').update(changes).eq('id', existing.id);
  if (updateError) throw updateError;

  // Servings matched by label, so past log entries keep their serving link.
  const current = new Map(
    ((existing.food_servings ?? []) as { id: string; label: string }[]).map((s) => [s.label, s.id]),
  );
  // Clear the default first: one default per food is enforced by a unique index.
  await admin.from('food_servings').update({ is_default: false }).eq('food_id', existing.id);
  for (const serving of item.servings) {
    const id = current.get(serving.label);
    const { error: servingError } = id
      ? await admin.from('food_servings').update(serving).eq('id', id)
      : await admin.from('food_servings').insert({ ...serving, food_id: existing.id });
    if (servingError) throw servingError;
    current.delete(serving.label);
  }
  if (current.size > 0) {
    const { error: deleteError } = await admin
      .from('food_servings')
      .delete()
      .in('id', [...current.values()]);
    if (deleteError) throw deleteError;
  }
  return 'updated';
}

/** Prints 10 items spread evenly through the list, so a reviewer can eyeball every section. */
function printSample(name: string, items: NormalizedItem[]): void {
  const step = Math.max(1, Math.floor(items.length / 10));
  const sample = items.filter((_, i) => i % step === 0).slice(0, 10);
  console.log(`\n${name}: sample of ${sample.length} of ${items.length} items`);
  for (const { food, servings } of sample) {
    const serving = servings.find((s) => s.is_default)?.label ?? servings[0]?.label ?? '?';
    console.log(
      `  ${food.name.padEnd(48)} ${serving.padEnd(20)} ${String(food.calories).padStart(5)} kcal ` +
        `P ${food.protein_g}  C ${food.carbs_g}  F ${food.fat_g}`,
    );
  }
}

for (const chain of chains) {
  const file = join(HERE, 'output', `${chain}.json`);
  if (!existsSync(file)) {
    console.error(`${chain}: no ${file}. Run npm run restaurants:extract -- ${chain} first.`);
    process.exitCode = 1;
    continue;
  }
  const output = JSON.parse(readFileSync(file, 'utf8')) as Output;
  const approved = output.flagged.filter((f) => f.approved === true);
  const candidates = [...output.items, ...approved];
  const blocked = candidates
    .map((item) => ({ item, blockers: uploadBlockers(item) }))
    .filter((b) => b.blockers.length > 0);
  for (const { item, blockers } of blocked) {
    console.log(`  ⊘ ${item.food.name}: ${blockers.join(' ')}`);
  }
  const toUpload = candidates.filter((item) => uploadBlockers(item).length === 0);
  printSample(output.name, toUpload);
  const counts = { inserted: 0, updated: 0, failed: 0 };
  for (const item of toUpload) {
    try {
      counts[await upsertItem(item)] += 1;
    } catch (e) {
      counts.failed += 1;
      console.error(`  ✗ ${item.food.name}: ${e instanceof Error ? e.message : JSON.stringify(e)}`);
    }
  }
  const verb = write ? '' : 'would be ';
  console.log(
    `${output.name}: ${counts.inserted} ${verb}inserted, ${counts.updated} ${verb}updated, ${counts.failed} failed; ` +
      `${output.flagged.length - approved.length} flagged item(s) skipped (set "approved": true to include), ` +
      `${blocked.length} blocked (missing macros or no standard portion).`,
  );
}
