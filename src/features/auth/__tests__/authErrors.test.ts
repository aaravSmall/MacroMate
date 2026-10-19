import {
  confirmLinkError,
  friendlyAuthError,
  isEmailNotConfirmed,
  NETWORK_ERROR_MESSAGE,
} from '@/features/auth/authErrors';

describe('friendlyAuthError', () => {
  it('returns null without an error', () => {
    expect(friendlyAuthError(null)).toBeNull();
  });

  it.each(['fetch failed', 'TypeError: Failed to fetch', 'Network request failed', 'Load failed'])(
    'explains network failures (%s)',
    (message) => {
      expect(friendlyAuthError({ message })).toBe(NETWORK_ERROR_MESSAGE);
    },
  );

  it('recognizes supabase retryable fetch errors by name', () => {
    expect(friendlyAuthError({ name: 'AuthRetryableFetchError', message: '{}' })).toBe(
      NETWORK_ERROR_MESSAGE,
    );
  });

  it('rewords invalid credentials', () => {
    expect(friendlyAuthError({ message: 'Invalid login credentials' })).toBe(
      "That email and password don't match an account.",
    );
  });

  it('passes other messages through', () => {
    expect(friendlyAuthError({ message: 'User already registered' })).toBe(
      'User already registered',
    );
  });
});

describe('email confirmation errors', () => {
  it('recognizes "Email not confirmed" and explains it', () => {
    const error = { message: 'Email not confirmed', code: 'email_not_confirmed' };
    expect(isEmailNotConfirmed(error)).toBe(true);
    expect(isEmailNotConfirmed({ message: 'Email not confirmed' })).toBe(true);
    expect(isEmailNotConfirmed({ message: 'Invalid login credentials' })).toBe(false);
    expect(isEmailNotConfirmed(null)).toBe(false);
    expect(friendlyAuthError(error)).toMatch(/confirm your email/i);
  });

  it('explains rate limits', () => {
    expect(friendlyAuthError({ message: 'email rate limit exceeded' })).toMatch(/wait a minute/i);
  });

  it('explains expired and used confirmation links', () => {
    expect(confirmLinkError('otp_expired')).toMatch(/expired/);
    expect(confirmLinkError(null)).toMatch(/isn't valid/);
  });
});
