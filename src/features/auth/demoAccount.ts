/**
 * Shared demo account for development. Created by supabase/seed.sql.
 * Supabase signs in with an email, so the "demo" username maps to DEMO_EMAIL.
 * Anyone with this repo knows these credentials: never seed this account into a production
 * project with real users' expectations of privacy.
 */
export const DEMO_USERNAME = 'demo';
export const DEMO_PASSWORD = 'demo123';
export const DEMO_EMAIL = 'demo@example.com';

/** Maps the demo username to its email; anything else is returned trimmed. */
export function resolveLoginEmail(input: string): string {
  const trimmed = input.trim();
  return trimmed.toLowerCase() === DEMO_USERNAME ? DEMO_EMAIL : trimmed;
}
