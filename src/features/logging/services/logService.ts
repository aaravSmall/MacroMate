import { nutritionFromLogRow, nutritionToLogRow } from '@/lib/nutrition';
import { requireUserId, supabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database';
import type { DailyTotals, LogEntry, MealType } from '@/types/domain';

import { buildLogInsert, type NewLogInput, rescaleTotals } from '../logic/snapshot';

export function mapLogRow(row: Tables<'log_entries'>): LogEntry {
  return {
    id: row.id,
    loggedAt: row.logged_at,
    localDate: row.local_date,
    meal: row.meal,
    foodId: row.food_id,
    servingId: row.serving_id,
    quantity: row.quantity,
    foodName: row.food_name,
    totals: nutritionFromLogRow(row),
  };
}

export function mapDailyTotalsRow(row: Tables<'daily_totals'>): DailyTotals {
  return {
    localDate: row.local_date ?? '',
    entryCount: row.entry_count ?? 0,
    calories: row.calories ?? 0,
    proteinG: row.protein_g ?? 0,
    carbsG: row.carbs_g ?? 0,
    fatG: row.fat_g ?? 0,
  };
}

/** Logs for a local date (`YYYY-MM-DD`), oldest first. */
export async function getLogsForDay(dateKey: string): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from('log_entries')
    .select('*')
    .eq('local_date', dateKey)
    .order('logged_at');
  if (error) throw error;
  return data.map(mapLogRow);
}

export async function getLog(id: string): Promise<LogEntry | null> {
  const { data, error } = await supabase.from('log_entries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapLogRow(data) : null;
}

/** The day's totals from the `daily_totals` view, or null when nothing is logged. */
export async function getDailyTotals(dateKey: string): Promise<DailyTotals | null> {
  const { data, error } = await supabase
    .from('daily_totals')
    .select('*')
    .eq('local_date', dateKey)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDailyTotalsRow(data) : null;
}

/** Local dates in [fromKey, toKey) with at least one log, from the `daily_totals` view. */
export async function getLoggedDateKeys(fromKey: string, toKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('daily_totals')
    .select('local_date')
    .gte('local_date', fromKey)
    .lt('local_date', toKey)
    .order('local_date', { ascending: false });
  if (error) throw error;
  return data.flatMap((row) => (row.local_date ? [row.local_date] : []));
}

export async function addLog(input: NewLogInput): Promise<LogEntry> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('log_entries')
    .insert(buildLogInsert(input, userId))
    .select()
    .single();
  if (error) throw error;
  return mapLogRow(data);
}

export type LogUpdate = {
  quantity?: number;
  meal?: MealType;
};

/** Changing the quantity rescales the entry's snapshot; the food itself isn't re-read. */
export async function updateLog(entry: LogEntry, update: LogUpdate): Promise<LogEntry> {
  const patch: TablesUpdate<'log_entries'> = {};
  if (update.meal !== undefined) patch.meal = update.meal;
  if (update.quantity !== undefined && update.quantity !== entry.quantity) {
    patch.quantity = update.quantity;
    Object.assign(
      patch,
      nutritionToLogRow(rescaleTotals(entry.totals, entry.quantity, update.quantity)),
    );
  }

  const { data, error } = await supabase
    .from('log_entries')
    .update(patch)
    .eq('id', entry.id)
    .select()
    .single();
  if (error) throw error;
  return mapLogRow(data);
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('log_entries').delete().eq('id', id);
  if (error) throw error;
}

/**
 * The signed-in user's logging streak, from the `current_streak` RPC: consecutive days with a
 * log, ending today (or yesterday) in `timezone`. Not capped; any logged day counts.
 */
export async function getCurrentStreak(timezone: string): Promise<number> {
  const { data, error } = await supabase.rpc('current_streak', { p_tz: timezone });
  if (error) throw error;
  return data;
}
