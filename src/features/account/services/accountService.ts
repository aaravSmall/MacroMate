import { supabase } from '@/lib/supabase';

/** Thrown when the account couldn't be deleted; the message is safe to show. */
export class DeleteAccountError extends Error {}

/**
 * Permanently deletes the signed-in user's account and all of their data, then signs out
 * locally.
 *
 * Runs in the `delete-account` Edge Function: deleting an auth user needs the service role,
 * which never ships in the app. The function deletes only the caller (from their session
 * token). Every user-owned table cascades from auth.users; private foods are removed by a
 * trigger, and public foods they added stay with owner_id set to null.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) {
    throw new DeleteAccountError(
      "We couldn't delete your account. Check your connection and try again. Your data hasn't changed.",
    );
  }
  // The user no longer exists on the server, so only clear the session stored on this device.
  await supabase.auth.signOut({ scope: 'local' });
}
