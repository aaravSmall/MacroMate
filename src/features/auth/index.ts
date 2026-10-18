export {
  type AuthContextValue,
  AuthProvider,
  type PasswordRecovery,
  useAuth,
} from './AuthProvider';
export type { AuthResult, SignUpResult } from './services/authService';
export {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from './validation';
export { DEMO_EMAIL, DEMO_PASSWORD, DEMO_USERNAME, resolveLoginEmail } from './demoAccount';
export { friendlyAuthError, NETWORK_ERROR_MESSAGE, recoveryLinkError } from './authErrors';
export {
  appPath,
  type AuthRedirect,
  isPasswordResetUrl,
  parseAuthRedirect,
} from './logic/authRedirect';
