import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
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
