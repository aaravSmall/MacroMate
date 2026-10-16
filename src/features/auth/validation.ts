export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message, or null when valid. */
export function validateEmail(email: string): string | null {
  if (email.trim() === '') return 'Enter your email.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

/** Returns an error message, or null when valid. */
export function validatePassword(password: string): string | null {
  if (password === '') return 'Enter your password.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function validatePasswordConfirmation(password: string, confirm: string): string | null {
  return password === confirm ? null : "Passwords don't match.";
}
