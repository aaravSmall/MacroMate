import {
  appPath,
  isEmailConfirmUrl,
  isPasswordResetUrl,
  parseAuthRedirect,
} from '@/features/auth/logic/authRedirect';

const BUILD = 'macromate://reset-password';
const EXPO_GO = 'exp://192.168.1.5:8081/--/reset-password';

describe('parseAuthRedirect', () => {
  it('reads implicit-flow tokens from the fragment', () => {
    expect(
      parseAuthRedirect(
        `${BUILD}#access_token=eyJ.a.b&expires_in=3600&refresh_token=r3fr35h&token_type=bearer&type=recovery`,
      ),
    ).toEqual({
      kind: 'tokens',
      accessToken: 'eyJ.a.b',
      refreshToken: 'r3fr35h',
      type: 'recovery',
    });
  });

  it('works for Expo Go URLs too', () => {
    expect(
      parseAuthRedirect(`${EXPO_GO}#access_token=a&refresh_token=b&type=recovery`),
    ).toMatchObject({ kind: 'tokens', accessToken: 'a', refreshToken: 'b' });
  });

  it('reads a PKCE code from the query', () => {
    expect(parseAuthRedirect(`${BUILD}?code=abc-123`)).toEqual({ kind: 'code', code: 'abc-123' });
  });

  it('reads a token hash, defaulting the type to recovery', () => {
    expect(parseAuthRedirect(`${BUILD}?token_hash=pkce_xyz&type=recovery`)).toEqual({
      kind: 'token_hash',
      tokenHash: 'pkce_xyz',
      type: 'recovery',
    });
    expect(parseAuthRedirect(`${BUILD}?token_hash=h`)).toMatchObject({ type: 'recovery' });
  });

  it('reports an expired link from the fragment, decoding + and %20', () => {
    expect(
      parseAuthRedirect(
        `${BUILD}#error=access_denied&error_code=otp_expired&error_description=Email+link+is%20invalid+or+has+expired`,
      ),
    ).toEqual({
      kind: 'error',
      code: 'otp_expired',
      description: 'Email link is invalid or has expired',
    });
  });

  it('reports errors in the query too, and prefers an error over tokens', () => {
    expect(parseAuthRedirect(`${BUILD}?error=server_error#access_token=a&refresh_token=b`)).toEqual(
      {
        kind: 'error',
        code: 'server_error',
        description: null,
      },
    );
  });

  it('needs both tokens', () => {
    expect(parseAuthRedirect(`${BUILD}#access_token=a`)).toEqual({ kind: 'none' });
  });

  it('returns none for a bare link or malformed encoding', () => {
    expect(parseAuthRedirect(BUILD)).toEqual({ kind: 'none' });
    expect(parseAuthRedirect(`${BUILD}#access_token=%E0%A4%A&refresh_token=x`)).toMatchObject({
      kind: 'tokens',
      accessToken: '%E0%A4%A',
    });
  });
});

describe('appPath / isPasswordResetUrl', () => {
  it('finds the route in build and Expo Go URLs', () => {
    expect(appPath(`${BUILD}#access_token=a`)).toBe('reset-password');
    expect(appPath(`${EXPO_GO}?code=1`)).toBe('reset-password');
    expect(appPath('exp://127.0.0.1:8081/--/food-detail/abc/')).toBe('food-detail/abc');
    expect(appPath('macromate://')).toBe('');
  });

  it('matches only the reset-password route', () => {
    expect(isPasswordResetUrl(BUILD)).toBe(true);
    expect(isPasswordResetUrl(`${EXPO_GO}#error=access_denied`)).toBe(true);
    expect(isPasswordResetUrl('macromate://today')).toBe(false);
    expect(isPasswordResetUrl('exp://127.0.0.1:8081')).toBe(false);
    expect(isPasswordResetUrl('macromate://reset-password-other')).toBe(false);
  });
});

describe('isEmailConfirmUrl', () => {
  it('matches confirm-email links in builds and Expo Go, not other paths', () => {
    expect(isEmailConfirmUrl('macromate://confirm-email#access_token=a&refresh_token=b')).toBe(
      true,
    );
    expect(isEmailConfirmUrl('exp://192.168.1.5:8081/--/confirm-email?code=abc')).toBe(true);
    expect(isEmailConfirmUrl('macromate://reset-password#access_token=a')).toBe(false);
  });

  it('parses a signup token hash', () => {
    expect(parseAuthRedirect('macromate://confirm-email?token_hash=xyz&type=signup')).toEqual({
      kind: 'token_hash',
      tokenHash: 'xyz',
      type: 'signup',
    });
  });
});
