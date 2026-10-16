import { supabase } from '@/lib/supabase';

/** Whether the user has finished onboarding (profiles.onboarding_completed_at is set). */
export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.onboarding_completed_at != null;
}
