export {
  type AuthContextValue,
  AuthProvider,
  type EmailConfirmation,
  type PasswordRecovery,
  useAuth,
} from './AuthProvider';
export type { AuthResult, SignInResult, SignUpResult } from './services/authService';
export {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validatePassword,
  validateNewPassword,
  validatePasswordConfirmation,
} from './validation';
export { DEMO_EMAIL, DEMO_PASSWORD, DEMO_USERNAME, resolveLoginEmail } from './demoAccount';
export {
  confirmLinkError,
  friendlyAuthError,
  isEmailNotConfirmed,
  NETWORK_ERROR_MESSAGE,
  recoveryLinkError,
} from './authErrors';
export {
  appPath,
  type AuthRedirect,
  isEmailConfirmUrl,
  isPasswordResetUrl,
  parseAuthRedirect,
} from './logic/authRedirect';
