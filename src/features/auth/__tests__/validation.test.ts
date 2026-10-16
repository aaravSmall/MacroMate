import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '@/features/auth/validation';

describe('validateEmail', () => {
  it('requires a value', () => {
    expect(validateEmail('')).toBe('Enter your email.');
    expect(validateEmail('   ')).toBe('Enter your email.');
  });

  it('rejects malformed addresses', () => {
    expect(validateEmail('name')).not.toBeNull();
    expect(validateEmail('name@domain')).not.toBeNull();
    expect(validateEmail('na me@domain.com')).not.toBeNull();
  });

  it('accepts valid addresses, ignoring surrounding whitespace', () => {
    expect(validateEmail('name@example.com')).toBeNull();
    expect(validateEmail('  name@example.com ')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires a value', () => {
    expect(validatePassword('')).toBe('Enter your password.');
  });

  it('enforces the minimum length', () => {
    expect(validatePassword('1234567')).not.toBeNull();
    expect(validatePassword('12345678')).toBeNull();
  });
});

describe('validatePasswordConfirmation', () => {
  it('requires matching passwords', () => {
    expect(validatePasswordConfirmation('abcdefgh', 'abcdefgi')).not.toBeNull();
    expect(validatePasswordConfirmation('abcdefgh', 'abcdefgh')).toBeNull();
  });
});
