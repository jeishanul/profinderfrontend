import { randomBytes } from 'node:crypto'

export default defineEventHandler((event) => {
  const provider = getRouterParam(event, 'provider')
  if (!isSocialProvider(provider) || !socialClientId(provider)) {
    return sendRedirect(event, '/?social=error&reason=unavailable')
  }

  const query = getQuery<{ remember?: string, returnTo?: string, reactivate?: string }>(event)

  // CSRF protection for the OAuth round trip: the callback only proceeds if the provider echoes `state` back.
  // The rest of what the person chose (remember me, where to land, reactivating) rides in the same httpOnly cookie.
  const flow: SocialFlow = {
    state: randomBytes(24).toString('hex'),
    remember: query.remember !== '0',
    returnTo: safeReturnTo(query.returnTo),
    reactivate: query.reactivate === '1',
  }
  setCookie(event, SOCIAL_STATE_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/api/auth/social',
    maxAge: 600,
  })

  const { url, scope } = socialAuthorize(provider)
  const params = new URLSearchParams({
    client_id: socialClientId(provider),
    redirect_uri: socialRedirectUri(provider),
    response_type: 'code',
    scope,
    state: flow.state,
  })

  return sendRedirect(event, `${url}?${params}`)
})
