import { useEffect, useState } from 'react';

import { isOnboardingComplete } from './services/onboardingService';

/** `null` while loading or when there's no user. */
export function useOnboardingComplete(userId: string | undefined): boolean | null {
  const [result, setResult] = useState<{ userId: string; complete: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    isOnboardingComplete(userId)
      // If the profile can't be read (e.g. offline), fall back to onboarding rather than
      // leaving the splash screen up forever.
      .catch(() => false)
      .then((complete) => {
        if (mounted) setResult({ userId, complete });
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Ignore a stale result from a previous user.
  return userId && result?.userId === userId ? result.complete : null;
}
