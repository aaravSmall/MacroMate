const NETWORK_ERROR = /fetch failed|failed to fetch|network request failed|load failed/i;

export const NETWORK_ERROR_MESSAGE =
  "Couldn't reach the server. Check your internet connection. If you're developing, check " +
  'that EXPO_PUBLIC_SUPABASE_URL in .env points at your Supabase project, then restart with ' +
  '`npx expo start --clear`.';

/** Turns a Supabase auth error into a message worth showing to a person. */
export function friendlyAuthError(
  error: { name?: string; message: string } | null | undefined,
): string | null {
  if (!error) return null;
  if (error.name === 'AuthRetryableFetchError' || NETWORK_ERROR.test(error.message)) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (/invalid login credentials/i.test(error.message)) {
    return "That email and password don't match an account.";
  }
  return error.message;
}

/** Message for a password reset link that couldn't be used. */
export function recoveryLinkError(code: string | null): string {
  if (code === 'otp_expired') {
    return 'This reset link has expired. Links work once and for a limited time, so request a new one.';
  }
  return "This reset link isn't valid anymore. It may have been used already. Request a new one.";
}
