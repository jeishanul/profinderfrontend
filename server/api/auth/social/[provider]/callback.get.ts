interface SocialLoginResult {
  token?: string
  twoFactorRequired?: true
  challengeToken?: string
}

export default defineEventHandler(async (event) => {
  const provider = getRouterParam(event, 'provider')
  const { code, state, error } = getQuery<{ code?: string, state?: string, error?: string }>(event)

  const expectedState = getCookie(event, SOCIAL_STATE_COOKIE)
  deleteCookie(event, SOCIAL_STATE_COOKIE, { path: '/api/auth/social' })

  if (!isSocialProvider(provider)) return sendRedirect(event, '/?social=error&reason=unavailable')
  // The person pressed "Cancel" at the provider, or the state doesn't match what we issued.
  if (error || !code) return sendRedirect(event, '/?social=error&reason=cancelled')
  if (!state || !expectedState || state !== expectedState) return sendRedirect(event, '/?social=error&reason=failed')

  try {
    const result = await callApi<SocialLoginResult>(event, `/auth/social/${provider}`, {
      method: 'POST',
      body: { code, redirectUri: socialRedirectUri(provider) },
      auth: false,
    })

    if (result.twoFactorRequired) {
      return sendRedirect(event, `/?social=2fa&challenge=${encodeURIComponent(result.challengeToken ?? '')}`)
    }

    setAuthToken(event, result.token!, true)
    return sendRedirect(event, '/?social=ok')
  }
  catch (e) {
    const code = (e as { data?: { code?: string } }).data?.code
    return sendRedirect(event, `/?social=error&reason=${encodeURIComponent(code ?? 'failed')}`)
  }
})
