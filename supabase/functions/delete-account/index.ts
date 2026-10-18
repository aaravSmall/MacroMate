/**
 * delete-account: permanently deletes the signed-in caller's account.
 *
 * - Deletes only the caller, identified by their verified session JWT. A user id is never read
 *   from the request.
 * - auth.admin.deleteUser needs the service role, so this runs server-side. Deleting the auth
 *   user cascades every user-owned row (profiles, goals, log_entries, exercise_entries,
 *   weigh_ins, food_verifications); the on_auth_user_deleted trigger removes their private
 *   foods, and public foods they added stay with owner_id set to null.
 */
import { adminClient, corsHeaders, json } from '../_shared/admin.ts';
import { signedInUserId } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let admin;
  try {
    admin = adminClient();
  } catch (error) {
    console.error('delete-account misconfigured', error instanceof Error ? error.message : error);
    return json({ error: 'Could not delete your account right now.' }, 500);
  }

  const userId = await signedInUserId(req, admin);
  if (!userId) return json({ error: 'Sign in to delete your account.' }, 401);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    // No PII: log only the error message, not the user's details.
    console.error('delete-account failed', error.message);
    return json({ error: 'Could not delete your account right now.' }, 500);
  }
  return new Response(null, { status: 204, headers: corsHeaders });
});
