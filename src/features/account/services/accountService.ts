/**
 * Permanently deletes the signed-in user's account and all of their data.
 *
 * TODO(server): implement as a Supabase Edge Function. Deleting an auth user needs the service
 * role (`auth.admin.deleteUser`), which must never ship in the app. Every user-owned table
 * references auth.users ON DELETE CASCADE, so deleting the auth user wipes all of their rows;
 * foods they shared are kept with contributed_by set to null.
 */
export async function deleteAccount(): Promise<never> {
  throw new Error('Deleting your account requires a server function that isn’t set up yet.');
}
