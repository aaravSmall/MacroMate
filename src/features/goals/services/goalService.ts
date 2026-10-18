import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';
import type { Goal } from '@/types/domain';

export function mapGoalRow(row: Tables<'goals'>): Goal {
  return {
    id: row.id,
    goalType: row.goal_type,
    startWeightKg: row.start_weight_kg,
    targetWeightKg: row.target_weight_kg,
    targetBodyFatPct: row.target_body_fat_pct,
    paceKgPerWeek: row.pace_kg_per_week,
    dailyCalorieTarget: row.daily_calorie_target,
    macroTargets: {
      proteinG: row.protein_target_g,
      carbsG: row.carbs_target_g,
      fatG: row.fat_target_g,
    },
    startedAt: row.started_at,
  };
}

export type NewGoal = Omit<Goal, 'id' | 'startedAt'>;

export function newGoalToRow(goal: NewGoal, userId: string): TablesInsert<'goals'> {
  return {
    user_id: userId,
    goal_type: goal.goalType,
    start_weight_kg: goal.startWeightKg,
    target_weight_kg: goal.targetWeightKg,
    target_body_fat_pct: goal.targetBodyFatPct,
    pace_kg_per_week: goal.paceKgPerWeek,
    daily_calorie_target: goal.dailyCalorieTarget,
    protein_target_g: goal.macroTargets.proteinG,
    carbs_target_g: goal.macroTargets.carbsG,
    fat_target_g: goal.macroTargets.fatG,
  };
}

/** The user's active goal (the one with no ended_at), or null before onboarding. */
export async function getActiveGoal(userId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();
  if (error) throw error;
  return data ? mapGoalRow(data) : null;
}

/**
 * Starts a new goal. The database allows one active goal per user, so the current one is ended
 * first, then the new one is inserted.
 * TODO(server): make this one transaction (an RPC) so a failed insert can't leave the user with
 * no active goal. Retrying is safe in the meantime.
 */
export async function setGoal(userId: string, goal: NewGoal): Promise<Goal> {
  const { error: endError } = await supabase
    .from('goals')
    .update({ ended_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('ended_at', null);
  if (endError) throw endError;

  const { data, error } = await supabase
    .from('goals')
    .insert(newGoalToRow(goal, userId))
    .select()
    .single();
  if (error) throw error;
  return mapGoalRow(data);
}
