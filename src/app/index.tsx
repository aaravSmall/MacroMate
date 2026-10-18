import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth';
import { useOnboardingComplete } from '@/features/onboarding';

/** Entry route: sends the user to the right group (the root layout enforces the same rules). */
export default function Index() {
  const { session, recovery } = useAuth();
  const onboardingComplete = useOnboardingComplete();

  if (recovery) return <Redirect href="/reset-password" />;
  if (!session) return <Redirect href="/sign-in" />;
  if (onboardingComplete === null) return null;
  return <Redirect href={onboardingComplete ? '/today' : '/welcome'} />;
}
