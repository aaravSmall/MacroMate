import {
  validateEmail,
  validateNewPassword,
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

describe('validateNewPassword', () => {
  it('needs 8+ characters with a letter and a number (server: letters_digits)', () => {
    expect(validateNewPassword('')).toBe('Enter your password.');
    expect(validateNewPassword('abc12')).toBe('Use at least 8 characters.');
    expect(validateNewPassword('abcdefgh')).toBe('Include at least one letter and one number.');
    expect(validateNewPassword('12345678')).toBe('Include at least one letter and one number.');
    expect(validateNewPassword('abcd1234')).toBeNull();
  });
});
