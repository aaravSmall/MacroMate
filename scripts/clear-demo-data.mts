/**
 * Clears a test account's data: all of its log entries and the private foods it created.
 * Public foods are never touched, whoever owns them. Prints what it would delete; deletes only
 * with --confirm.
 *
 * Needs the service role key in the environment (never hard-code or commit it):
 *   SUPABASE_URL=https://<ref>.supabase.co
 *   SUPABASE_SECRET_KEY=sb_secret_…      (or SUPABASE_SERVICE_ROLE_KEY=…)
 *
 * Usage: npm run demo:clear [-- --email someone@example.com] [-- --confirm]
 * Defaults to the shared demo account (demo@example.com).
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/types/database';

const DEFAULT_EMAIL = 'demo@example.com';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const emailFlag = args.indexOf('--email');
const email = (emailFlag >= 0 ? args[emailFlag + 1] : DEFAULT_EMAIL)?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run demo:clear -- [--email <email>] [--confirm]');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (service role) in the environment.');
  process.exit(1);
}
const admin = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId(target: string): Promise<string | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === target);
    if (user) return user.id;
    if (data.users.length < 1000) return null;
  }
}

const userId = await findUserId(email);
if (!userId) {
  console.error(`No user with email ${email}.`);
  process.exit(1);
}

const { data: entries, error: entriesError } = await admin
  .from('log_entries')
  .select('id, local_date, meal, food_name')
  .eq('user_id', userId)
  .order('local_date');
if (entriesError) throw entriesError;

// Only this user's private foods. Public foods stay, even ones this account shared.
const { data: foods, error: foodsError } = await admin
  .from('foods')
  .select('id, name, source')
  .eq('owner_id', userId)
  .eq('visibility', 'private');
if (foodsError) throw foodsError;

console.log(`Account ${email} (${userId}) against ${url}`);
console.log(`\n${entries.length} log entr${entries.length === 1 ? 'y' : 'ies'}:`);
for (const e of entries) console.log(`  ${e.local_date}  ${e.meal.padEnd(9)} ${e.food_name}`);
console.log(`\n${foods.length} private food(s):`);
for (const f of foods) console.log(`  ${f.name} (${f.source})`);

if (!confirm) {
  console.log('\nDry run. Re-run with --confirm to delete these.');
  process.exit(0);
}

if (entries.length > 0) {
  const { error } = await admin
    .from('log_entries')
    .delete()
    .eq('user_id', userId)
    .in(
      'id',
      entries.map((e) => e.id),
    );
  if (error) throw error;
}
if (foods.length > 0) {
  // Servings and verifications cascade.
  const { error } = await admin
    .from('foods')
    .delete()
    .eq('owner_id', userId)
    .eq('visibility', 'private')
    .in(
      'id',
      foods.map((f) => f.id),
    );
  if (error) throw error;
}
console.log(`\nDeleted ${entries.length} log entries and ${foods.length} private food(s).`);
