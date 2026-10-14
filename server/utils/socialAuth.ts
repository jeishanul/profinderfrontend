export const SOCIAL_PROVIDERS = ['google', 'facebook'] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

export const SOCIAL_STATE_COOKIE = 'fp_social_state'
/** Holds a 2FA challenge or a "finish creating your account" token between the OAuth callback and the next step. */
export const SOCIAL_PENDING_COOKIE = 'fp_social_pending'

export function isSocialProvider(value: string | undefined): value is SocialProvider {
  return SOCIAL_PROVIDERS.includes(value as SocialProvider)
}

export function socialClientId(provider: SocialProvider): string {
  const config = useRuntimeConfig()
  return provider === 'google' ? config.socialGoogleClientId : config.socialFacebookClientId
}

/** Must match the redirect URI registered with the provider and the `services.*.redirect` Laravel is configured with. */
export function socialRedirectUri(provider: SocialProvider): string {
  return `${useRuntimeConfig().socialRedirectBase}/api/auth/social/${provider}/callback`
}

export function socialAuthorize(provider: SocialProvider): { url: string, scope: string } {
  if (provider === 'google') return { url: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'openid email profile' }
  return { url: `https://www.facebook.com/${useRuntimeConfig().socialFacebookGraphVersion}/dialog/oauth`, scope: 'email,public_profile' }
}

/** What the person asked for before leaving for the provider; it travels in the (httpOnly) state cookie, not the URL. */
export interface SocialFlow {
  state: string
  /** "Remember me" — how long the session cookie lives. */
  remember: boolean
  /** The page they were on, so they come back to it (locale prefix included). */
  returnTo: string
  /** They are coming back to a deactivated account on purpose. */
  reactivate: boolean
}

export interface SocialPending {
  kind: '2fa' | 'terms'
  token: string
  remember: boolean
}

export function setSocialPending(event: Parameters<typeof setCookie>[0], pending: SocialPending) {
  setCookie(event, SOCIAL_PENDING_COOKIE, JSON.stringify(pending), {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/api/auth',
    maxAge: 600,
  })
}

export function readSocialPending(event: Parameters<typeof getCookie>[0], kind: SocialPending['kind']): SocialPending | null {
  const raw = getCookie(event, SOCIAL_PENDING_COOKIE)
  if (!raw) return null
  try {
    const pending = JSON.parse(raw) as SocialPending
    return pending.kind === kind && typeof pending.token === 'string' ? pending : null
  }
  catch {
    return null
  }
}

export function clearSocialPending(event: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(event, SOCIAL_PENDING_COOKIE, { path: '/api/auth' })
}
