import { Redirect } from 'expo-router';

export default function Index() {
  // TODO(auth): gate here once auth + onboarding exist:
  //   loading → splash, no session → /(auth)/sign-in,
  //   onboarding incomplete → /(onboarding)/welcome, otherwise → /(tabs)/today.
  return <Redirect href="/today" />;
}
