import {
  changeGoal,
  goalToChangeGoalArgs,
  type NewGoal,
} from '@/features/goals/services/goalService';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

const rpc = supabase.rpc as unknown as jest.Mock;

const goal: NewGoal = {
  goalType: 'lose',
  startWeightKg: 90,
  targetWeightKg: 80,
  targetBodyFatPct: null,
  paceKgPerWeek: 0.45,
  dailyCalorieTarget: 2340,
  macroTargets: { proteinG: 146, carbsG: 263, fatG: null },
};

const row: Tables<'goals'> = {
  id: 'goal-2',
  user_id: 'user-1',
  goal_type: 'lose',
  start_weight_kg: 90,
  target_weight_kg: 80,
  target_body_fat_pct: null,
  pace_kg_per_week: 0.45,
  daily_calorie_target: 2340,
  protein_target_g: 146,
  carbs_target_g: 263,
  fat_target_g: null,
  started_at: '2026-10-18T12:00:00.000Z',
  ended_at: null,
  created_at: '2026-10-18T12:00:00.000Z',
};

beforeEach(() => rpc.mockReset());

describe('goalToChangeGoalArgs', () => {
  it('maps every field and leaves null optionals to the function defaults', () => {
    expect(goalToChangeGoalArgs(goal)).toEqual({
      p_goal_type: 'lose',
      p_start_weight_kg: 90,
      p_daily_calorie_target: 2340,
      p_pace_kg_per_week: 0.45,
      p_target_weight_kg: 80,
      p_protein_target_g: 146,
      p_carbs_target_g: 263,
    });
  });
});

describe('changeGoal', () => {
  it('calls the change_goal RPC once and maps the returned row', async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    const result = await changeGoal(goal);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('change_goal', goalToChangeGoalArgs(goal));
    expect(result).toEqual({
      id: 'goal-2',
      goalType: 'lose',
      startWeightKg: 90,
      targetWeightKg: 80,
      targetBodyFatPct: null,
      paceKgPerWeek: 0.45,
      dailyCalorieTarget: 2340,
      macroTargets: { proteinG: 146, carbsG: 263, fatG: null },
      startedAt: '2026-10-18T12:00:00.000Z',
    });
  });

  it('throws the RPC error', async () => {
    const error = { code: '42501', message: 'not signed in' };
    rpc.mockResolvedValue({ data: null, error });
    await expect(changeGoal(goal)).rejects.toBe(error);
  });
});
