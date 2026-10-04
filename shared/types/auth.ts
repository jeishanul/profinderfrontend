/** The authenticated user, as returned by /api/auth/me, /login, /register. */
export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  isProvider: boolean
  /** The address has been confirmed with a code. Booking requests and becoming a provider need it. */
  emailVerified: boolean
}

/**
 * What `/api/auth/login` returns instead of an `AuthUser` when the account
 * has 2FA enabled — no token is issued yet. `challengeToken` gets passed
 * back to `/api/auth/two-factor/challenge` along with the person's
 * authenticator code (or a recovery code) to actually complete login.
 */
export interface TwoFactorChallenge {
  twoFactorRequired: true
  challengeToken: string
}

export interface TwoFactorSetup {
  secret: string
  qrCodeSvg: string
}

export interface TwoFactorConfirmResult {
  recoveryCodes: string[]
}
