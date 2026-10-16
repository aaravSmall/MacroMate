import type { Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import * as authService from './services/authService';

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the persisted session has been restored. */
  loading: boolean;
  signIn: typeof authService.signIn;
  signUp: typeof authService.signUp;
  signOut: typeof authService.signOut;
  resetPassword: typeof authService.resetPassword;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    authService
      .getSession()
      .then((restored) => {
        if (mounted) setSession(restored);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const unsubscribe = authService.onAuthChange((next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signOut: authService.signOut,
      resetPassword: authService.resetPassword,
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
