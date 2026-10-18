import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

import { friendlyAuthError, recoveryLinkError } from '../authErrors';
import type { AuthRedirect } from '../logic/authRedirect';

export type AuthResult = { error: string | null };
export type SignUpResult = AuthResult & { needsEmailConfirmation: boolean };

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(
  callback: (session: Session | null, event: AuthChangeEvent) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(session, event));
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
    // The link opens /reset-password (ResetPasswordScreen); AuthProvider handles the tokens.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('/reset-password'),
    });
    return { error: friendlyAuthError(error) };
  }, {});
}

/**
 * Establishes the recovery session from a password reset link: implicit-flow tokens
 * (setSession), a PKCE code (exchangeCodeForSession), or a token hash (verifyOtp).
 */
export function beginPasswordRecovery(redirect: AuthRedirect): Promise<AuthResult> {
  return safely(async () => {
    switch (redirect.kind) {
      case 'tokens': {
        const { error } = await supabase.auth.setSession({
          access_token: redirect.accessToken,
          refresh_token: redirect.refreshToken,
        });
        return { error: error ? recoveryLinkError(null) : null };
      }
      case 'code': {
        const { error } = await supabase.auth.exchangeCodeForSession(redirect.code);
        return { error: error ? recoveryLinkError(null) : null };
      }
      case 'token_hash': {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: redirect.tokenHash,
          type: 'recovery',
        });
        return { error: error ? recoveryLinkError(error.code ?? null) : null };
      }
      case 'error':
        return { error: recoveryLinkError(redirect.code) };
      case 'none':
        return { error: recoveryLinkError(null) };
    }
  }, {});
}

/** Sets a new password for the signed-in (recovery) session. */
export function updatePassword(password: string): Promise<AuthResult> {
  return safely(async () => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: friendlyAuthError(error) };
  }, {});
}
