import { useProfile } from '@/features/account';

/**
 * Whether the signed-in user has finished onboarding (profiles.onboarded_at).
 * `null` while loading or when signed out.
 */
export function useOnboardingComplete(): boolean | null {
  const { data: profile, isPending, isError } = useProfile();
  if (isError) {
    // Signing up needs the network, so a profile read failing (e.g. offline at launch) almost
    // always means an existing, onboarded user. Let them into the app.
    return true;
  }
  if (isPending) return null;
  return profile?.onboardedAt != null;
}
