/**
 * Parses the URL an auth email link sends the user back to. Pure, so it's easy to test.
 *
 * Supabase can return any of these, depending on the client's flow type and email template:
 * - implicit flow (our client's default): `#access_token=…&refresh_token=…&type=recovery`
 * - PKCE flow: `?code=…`
 * - token-hash templates: `?token_hash=…&type=recovery`
 * - failures: `#error=access_denied&error_code=otp_expired&error_description=…` (or in the query)
 */

export type AuthRedirect =
  | { kind: 'tokens'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'code'; code: string }
  | { kind: 'token_hash'; tokenHash: string; type: string }
  | { kind: 'error'; code: string | null; description: string | null }
  | { kind: 'none' };

function parseParams(part: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const pair of part.split('&')) {
    if (!pair) continue;
    const [rawKey = '', ...rest] = pair.split('=');
    const decode = (s: string) => {
      try {
        return decodeURIComponent(s.replace(/\+/g, ' '));
      } catch {
        return s;
      }
    };
    params.set(decode(rawKey), decode(rest.join('=')));
  }
  return params;
}

/** Query and fragment params merged; fragment wins (implicit-flow tokens live there). */
function urlParams(url: string): Map<string, string> {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);
  return new Map([...parseParams(query), ...parseParams(fragment)]);
}

export function parseAuthRedirect(url: string): AuthRedirect {
  const params = urlParams(url);
  const error = params.get('error') ?? params.get('error_code');
  if (error) {
    return {
      kind: 'error',
      code: params.get('error_code') ?? params.get('error') ?? null,
      description: params.get('error_description') ?? null,
    };
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken, type: params.get('type') ?? null };
  }
  const code = params.get('code');
  if (code) return { kind: 'code', code };
  const tokenHash = params.get('token_hash');
  if (tokenHash) return { kind: 'token_hash', tokenHash, type: params.get('type') ?? 'recovery' };
  return { kind: 'none' };
}

/**
 * The route path of an app URL, e.g. `reset-password` for both
 * `calorietracker://reset-password#…` (builds) and `exp://192.168.1.5:8081/--/reset-password`
 * (Expo Go).
 */
export function appPath(url: string): string {
  const withoutParams = url.split(/[?#]/)[0] ?? '';
  const expoGo = withoutParams.indexOf('/--/');
  const rest =
    expoGo !== -1
      ? withoutParams.slice(expoGo + 4)
      : withoutParams.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  return rest.replace(/^\/+|\/+$/g, '');
}

export function isPasswordResetUrl(url: string): boolean {
  return appPath(url) === 'reset-password';
}
