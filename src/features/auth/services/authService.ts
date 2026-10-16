import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

export type AuthResult = { error: string | null };
export type SignUpResult = AuthResult & { needsEmailConfirmation: boolean };

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return {
    error: error?.message ?? null,
    // With email confirmation on, sign-up succeeds but returns no session.
    needsEmailConfirmation: !error && !data.session,
  };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function resetPassword(email: string): Promise<AuthResult> {
  // TODO(auth): add a screen that handles this deep link and calls updateUser({ password }).
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL('/reset-password'),
  });
  return { error: error?.message ?? null };
}
