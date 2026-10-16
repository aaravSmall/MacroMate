import { requireUserId, supabase } from '@/lib/supabase';
import type { UserFood } from '@/types/domain';

import { mapUserFoodRow, type UserFoodInput, userFoodInputToRow } from './mappers';

export type { UserFoodInput };

export async function listUserFoods(): Promise<UserFood[]> {
  const { data, error } = await supabase.from('user_foods').select('*').order('name');
  if (error) throw error;
  return data.map(mapUserFoodRow);
}

export async function createUserFood(input: UserFoodInput): Promise<UserFood> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('user_foods')
    .insert({ ...userFoodInputToRow(input), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return mapUserFoodRow(data);
}

export async function updateUserFood(id: string, input: UserFoodInput): Promise<UserFood> {
  const { data, error } = await supabase
    .from('user_foods')
    .update(userFoodInputToRow(input))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapUserFoodRow(data);
}

export async function deleteUserFood(id: string): Promise<void> {
  const { error } = await supabase.from('user_foods').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Shares a user food to the global database.
 * TODO(server): implement as a Supabase Edge Function. `foods` has no client insert policy,
 * so this must run with the service role (and should moderate/validate the submission).
 */
export async function shareToGlobal(_id: string): Promise<never> {
  throw new Error('Sharing to the global database is not implemented yet.');
}
