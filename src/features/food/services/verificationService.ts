import { requireUserId, supabase } from '@/lib/supabase';

/** The user's answer to "Does this match your label?" for a food, or null if not asked yet. */
export async function getMyVerification(foodId: string): Promise<boolean | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('food_verifications')
    .select('matches')
    .eq('food_id', foodId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? data.matches : null;
}

/**
 * Records (or changes) the user's answer. The food's verification_count / mismatch_count are
 * updated by a database trigger.
 */
export async function verifyFood(foodId: string, matches: boolean): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('food_verifications')
    .upsert(
      { food_id: foodId, user_id: userId, matches, verified_at: new Date().toISOString() },
      { onConflict: 'food_id,user_id' },
    );
  if (error) throw error;
}
