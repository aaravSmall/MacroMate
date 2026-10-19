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
  if (!isDev() && isLocalUrl(url)) {
    throw new Error(
      `${name} points at a local server (${url}) in a release build. Set the production value ` +
        'with `eas env:create --environment production`.',
    );
  }
  return url;
}

/** Local or LAN addresses that only make sense in development. */
export function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(
    url,
  );
}

function isDev(): boolean {
  return typeof __DEV__ === 'undefined' || __DEV__;
}

export const env = {
  supabaseUrl: requireUrl('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
