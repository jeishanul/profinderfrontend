import { randomBytes } from 'node:crypto'

export default defineEventHandler((event) => {
  const provider = getRouterParam(event, 'provider')
  if (!isSocialProvider(provider) || !socialClientId(provider)) {
    return sendRedirect(event, '/?social=error&reason=unavailable')
  }

  // CSRF protection for the OAuth round trip: the callback only proceeds if the provider echoes this back.
  const state = randomBytes(24).toString('hex')
  setCookie(event, SOCIAL_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/api/auth/social',
    maxAge: 600,
  })

  const { url, scope } = SOCIAL_AUTHORIZE[provider]
  const params = new URLSearchParams({
    client_id: socialClientId(provider),
    redirect_uri: socialRedirectUri(provider),
    response_type: 'code',
    scope,
    state,
  })

  return sendRedirect(event, `${url}?${params}`)
})
