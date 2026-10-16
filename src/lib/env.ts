/**
 * Validated public environment variables.
 *
 * Expo only inlines EXPO_PUBLIC_* variables when they're read as literal
 * `process.env.EXPO_PUBLIC_…` expressions, so each one is referenced explicitly here.
 */

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env, fill in your Supabase ` +
        'project values, then restart the dev server (npx expo start --clear).',
    );
  }
  return value.trim();
}

function requireUrl(name: string, value: string | undefined): string {
  const url = requireEnv(name, value);
  if (!/^https?:\/\/\S+$/.test(url)) {
    throw new Error(`Environment variable ${name} must be a full http(s) URL, got "${url}".`);
  }
  return url;
}

export const env = {
  supabaseUrl: requireUrl('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
