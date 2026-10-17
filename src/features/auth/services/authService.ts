import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

import { friendlyAuthError } from '../authErrors';

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

/** Runs an auth call, converting thrown network errors into an AuthResult. */
async function safely<T extends AuthResult>(run: () => Promise<T>, fallback: Omit<T, 'error'>) {
  try {
    return await run();
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return { ...fallback, error: friendlyAuthError(error) } as T;
  }
}

export function signIn(email: string, password: string): Promise<AuthResult> {
  return safely(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: friendlyAuthError(error) };
  }, {});
}

export function signUp(email: string, password: string): Promise<SignUpResult> {
  return safely<SignUpResult>(
    async () => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      return {
        error: friendlyAuthError(error),
        // With email confirmation on, sign-up succeeds but returns no session.
        needsEmailConfirmation: !error && !data.session,
      };
    },
    { needsEmailConfirmation: false },
  );
}

export function signOut(): Promise<AuthResult> {
  return safely(async () => {
    const { error } = await supabase.auth.signOut();
    return { error: friendlyAuthError(error) };
  }, {});
}

export function resetPassword(email: string): Promise<AuthResult> {
  return safely(async () => {
    // TODO(auth): add a screen that handles this deep link and calls updateUser({ password }).
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('/reset-password'),
    });
    return { error: friendlyAuthError(error) };
  }, {});
}
