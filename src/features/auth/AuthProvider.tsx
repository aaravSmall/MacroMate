import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { isEmailConfirmUrl, isPasswordResetUrl, parseAuthRedirect } from './logic/authRedirect';
import * as authService from './services/authService';

/**
 * A password reset in progress, from opening the email link until the new password is saved
 * (or the user gives up). While set, the root layout shows only /reset-password.
 */
export type PasswordRecovery =
  { status: 'verifying' } | { status: 'ready' } | { status: 'error'; message: string };

/** A sign-up confirmation link being processed. On success the session takes over routing. */
export type EmailConfirmation = { status: 'verifying' } | { status: 'error'; message: string };

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the persisted session is restored and the launch URL has been checked. */
  loading: boolean;
  signIn: typeof authService.signIn;
  signUp: typeof authService.signUp;
  signOut: typeof authService.signOut;
  resetPassword: typeof authService.resetPassword;
  updatePassword: typeof authService.updatePassword;
  resendConfirmation: typeof authService.resendConfirmation;
  recovery: PasswordRecovery | null;
  emailConfirmation: EmailConfirmation | null;
  /** Ends the reset flow so normal routing resumes. */
  finishRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [initialUrlChecked, setInitialUrlChecked] = useState(false);
  const [recovery, setRecovery] = useState<PasswordRecovery | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState<EmailConfirmation | null>(null);
  const handledUrls = useRef(new Set<string>());

  // Auth email links (password reset, sign-up confirmation): the URL that launched the app, and
  // any opened while it's running.
  // (getInitialURL + the url event, rather than useLinkingURL, which is null in Expo Go.)
  useEffect(() => {
    let mounted = true;
    const handle = (url: string | null) => {
      if (!url || handledUrls.current.has(url)) return;
      if (isEmailConfirmUrl(url)) {
        handledUrls.current.add(url);
        setEmailConfirmation({ status: 'verifying' });
        void authService.completeEmailConfirmation(parseAuthRedirect(url)).then((result) => {
          if (!mounted) return;
          // Success: the new session routes the user on to onboarding.
          setEmailConfirmation(result.error ? { status: 'error', message: result.error } : null);
        });
        return;
      }
      if (!isPasswordResetUrl(url)) return;
      handledUrls.current.add(url);
      setRecovery({ status: 'verifying' });
      void authService.beginPasswordRecovery(parseAuthRedirect(url)).then((result) => {
        if (!mounted) return;
        setRecovery(
          result.error ? { status: 'error', message: result.error } : { status: 'ready' },
        );
      });
    };
    void Linking.getInitialURL()
      .then(handle)
      .finally(() => {
        if (mounted) setInitialUrlChecked(true);
      });
    const subscription = Linking.addEventListener('url', (event) => handle(event.url));
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    authService
      .getSession()
      .then((restored) => {
        if (mounted) setSession(restored);
      })
      .finally(() => {
        if (mounted) setSessionRestored(true);
      });

    const unsubscribe = authService.onAuthChange((next, event) => {
      setSession(next);
      setSessionRestored(true);
      // Emitted when Supabase itself processes a recovery link (e.g. verifyOtp).
      if (event === 'PASSWORD_RECOVERY') setRecovery({ status: 'ready' });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Routing waits for both, so a reset link never flashes the sign-in screen first.
  const loading = !sessionRestored || !initialUrlChecked;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signOut: authService.signOut,
      resetPassword: authService.resetPassword,
      updatePassword: authService.updatePassword,
      resendConfirmation: authService.resendConfirmation,
      recovery,
      emailConfirmation,
      finishRecovery: () => setRecovery(null),
    }),
    [session, loading, recovery, emailConfirmation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
