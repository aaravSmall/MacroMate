import { supabase } from '@/lib/supabase';
import type { Database, Tables } from '@/types/database';
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

export type ChangeGoalArgs = Database['public']['Functions']['change_goal']['Args'];

/**
 * Arguments for the `change_goal` RPC. Optional values that are null are left out so the
 * function's `default null` applies.
 */
export function goalToChangeGoalArgs(goal: NewGoal): ChangeGoalArgs {
  const args: ChangeGoalArgs = {
    p_goal_type: goal.goalType,
    p_start_weight_kg: goal.startWeightKg,
    p_daily_calorie_target: goal.dailyCalorieTarget,
    p_pace_kg_per_week: goal.paceKgPerWeek,
  };
  if (goal.targetWeightKg !== null) args.p_target_weight_kg = goal.targetWeightKg;
  if (goal.targetBodyFatPct !== null) args.p_target_body_fat_pct = goal.targetBodyFatPct;
  if (goal.macroTargets.proteinG !== null) args.p_protein_target_g = goal.macroTargets.proteinG;
  if (goal.macroTargets.carbsG !== null) args.p_carbs_target_g = goal.macroTargets.carbsG;
  if (goal.macroTargets.fatG !== null) args.p_fat_target_g = goal.macroTargets.fatG;
  return args;
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
 * Starts a new goal for the signed-in user: the first one at onboarding, or a change later.
 * `change_goal` ends the active goal and inserts the new one in a single transaction, so the
 * user is never left without an active goal. It runs as the user, so RLS on `goals` applies.
 */
export async function changeGoal(goal: NewGoal): Promise<Goal> {
  const { data, error } = await supabase.rpc('change_goal', goalToChangeGoalArgs(goal));
  if (error) throw error;
  return mapGoalRow(data);
}
