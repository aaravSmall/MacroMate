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
