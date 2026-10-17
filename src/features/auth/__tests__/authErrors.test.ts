import { friendlyAuthError, NETWORK_ERROR_MESSAGE } from '@/features/auth/authErrors';

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
    expect(friendlyAuthError({ message: 'Email rate limit exceeded' })).toBe(
      'Email rate limit exceeded',
    );
  });
});
