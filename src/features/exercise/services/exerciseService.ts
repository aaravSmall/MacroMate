import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';
import type { ExerciseEntry } from '@/types/domain';

export function mapExerciseRow(row: Tables<'exercise_entries'>): ExerciseEntry {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    activityType: row.activity_type,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    localDate: row.local_date,
    activeCalories: row.active_calories,
  };
}

/** Whole minutes between start and end. */
export function exerciseDurationMin(entry: Pick<ExerciseEntry, 'startedAt' | 'endedAt'>): number {
  const ms = new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime();
  return Math.max(0, Math.round(ms / 60_000));
}

/** Exercise on the given local date (`YYYY-MM-DD`), oldest first. */
export async function getExerciseForDay(dateKey: string): Promise<ExerciseEntry[]> {
  const { data, error } = await supabase
    .from('exercise_entries')
    .select('*')
    .eq('local_date', dateKey)
    .order('started_at');
  if (error) throw error;
  return data.map(mapExerciseRow);
}

/** This user's Apple Health entries that started within [from, to] (RLS limits to own rows). */
export async function listHealthEntries(from: Date, to: Date): Promise<ExerciseEntry[]> {
  const { data, error } = await supabase
    .from('exercise_entries')
    .select('*')
    .eq('source', 'apple_health')
    .gte('started_at', from.toISOString())
    .lte('started_at', to.toISOString());
  if (error) throw error;
  return data.map(mapExerciseRow);
}

/** Inserts or updates synced workouts, keyed on (user_id, external_id). */
export async function upsertExerciseEntries(
  rows: TablesInsert<'exercise_entries'>[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('exercise_entries')
    .upsert(rows, { onConflict: 'user_id,external_id' });
  if (error) throw error;
}

export async function deleteExerciseEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('exercise_entries').delete().in('id', ids);
  if (error) throw error;
}
