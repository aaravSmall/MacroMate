import { useEffect, useState } from 'react';

/**
 * Whether the user has finished onboarding.
 * TODO(db): read profiles.onboarding_completed_at once the profiles table exists.
 */
export async function isOnboardingComplete(_userId: string): Promise<boolean> {
  return false;
}

/** `null` while loading or when there's no user. */
export function useOnboardingComplete(userId: string | undefined): boolean | null {
  const [result, setResult] = useState<{ userId: string; complete: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    void isOnboardingComplete(userId).then((complete) => {
      if (mounted) setResult({ userId, complete });
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Ignore a stale result from a previous user.
  return userId && result?.userId === userId ? result.complete : null;
}
