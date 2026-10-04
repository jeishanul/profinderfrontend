export const SOCIAL_PROVIDERS = ['google', 'facebook'] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

export const SOCIAL_STATE_COOKIE = 'fp_social_state'

export function isSocialProvider(value: string | undefined): value is SocialProvider {
  return SOCIAL_PROVIDERS.includes(value as SocialProvider)
}

export function socialClientId(provider: SocialProvider): string {
  const config = useRuntimeConfig()
  return provider === 'google' ? config.socialGoogleClientId : config.socialFacebookClientId
}

/** Must match the redirect URI registered with the provider and the one Laravel is told about. */
export function socialRedirectUri(provider: SocialProvider): string {
  return `${useRuntimeConfig().socialRedirectBase}/api/auth/social/${provider}/callback`
}

export const SOCIAL_AUTHORIZE: Record<SocialProvider, { url: string, scope: string }> = {
  google: { url: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'openid email profile' },
  facebook: { url: 'https://www.facebook.com/v19.0/dialog/oauth', scope: 'email,public_profile' },
}
