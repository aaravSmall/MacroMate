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
  if (isEmailNotConfirmed(error)) {
    return 'Confirm your email first. Check your inbox for the link, or send a new one.';
  }
  if (/rate limit|too many|for security purposes/i.test(error.message)) {
    return 'Too many tries. Wait a minute, then try again.';
  }
  return error.message;
}

/** Supabase's "Email not confirmed" sign-in error. */
export function isEmailNotConfirmed(error: { message: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message);
}

/** Message for a confirmation link that couldn't be used. */
export function confirmLinkError(code: string | null): string {
  if (code === 'otp_expired') {
    return 'This confirmation link has expired. Send a new one and use it within an hour.';
  }
  return "This confirmation link isn't valid anymore. It may have been used already. Try signing in, or send a new link.";
}

/** Message for a password reset link that couldn't be used. */
export function recoveryLinkError(code: string | null): string {
  if (code === 'otp_expired') {
    return 'This reset link has expired. Links work once and for a limited time, so request a new one.';
  }
  return "This reset link isn't valid anymore. It may have been used already. Request a new one.";
}
