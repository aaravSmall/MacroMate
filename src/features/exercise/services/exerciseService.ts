import { startOfLocalDay, startOfNextLocalDay } from '@/lib/dates';
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
    durationMin: row.duration_min,
    caloriesBurned: row.calories_burned,
  };
}

/** Exercise that started on the local calendar day containing `date`, oldest first. */
export async function getExerciseForDay(date: Date): Promise<ExerciseEntry[]> {
  const { data, error } = await supabase
    .from('exercise_entries')
    .select('*')
    .gte('started_at', startOfLocalDay(date).toISOString())
    .lt('started_at', startOfNextLocalDay(date).toISOString())
    .order('started_at');
  if (error) throw error;
  return data.map(mapExerciseRow);
}
