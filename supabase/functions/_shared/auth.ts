/**
 * Caller authentication shared by Edge Functions. No Deno or npm imports, so the app's Jest
 * suite can test it.
 *
 * verify_jwt = true is the platform check, but with publishable keys the gateway also admits
 * requests that carry only the `apikey`. So every function verifies the caller's session JWT
 * itself with auth.getUser, which also confirms the user still exists.
 */

/** The slice of a Supabase client this module needs. */
export type AuthClient = {
  auth: {
    getUser(jwt: string): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
};

/** The bearer token from an Authorization header, if it's a JWT (not a publishable/secret key). */
export function bearerToken(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  const token = match?.[1];
  if (!token || token.startsWith('sb_')) return null;
  return token;
}

/** The signed-in caller's user id, or null when the request has no valid user session. */
export async function signedInUserId(req: Request, client: AuthClient): Promise<string | null> {
  const token = bearerToken(req.headers.get('Authorization'));
  if (!token) return null;
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/** Constant-time string comparison (no early exit on the first differing character). */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * True for trusted server callers: the cron job (x-cron-secret header) or a request carrying the
 * project's secret / service-role key (apikey or Authorization: Bearer). Never true for users.
 */
export function isTrustedCaller(
  req: Request,
  { serviceKeys, cronSecret }: { serviceKeys: string[]; cronSecret: string | null },
): boolean {
  const cron = req.headers.get('x-cron-secret');
  if (cronSecret && cron && safeEqual(cron, cronSecret)) return true;
  const presented = [
    req.headers.get('apikey'),
    /^Bearer\s+(\S+)$/i.exec(req.headers.get('Authorization') ?? '')?.[1] ?? null,
  ].filter((k): k is string => !!k);
  return presented.some((k) => serviceKeys.some((s) => s.length > 0 && safeEqual(k, s)));
}
