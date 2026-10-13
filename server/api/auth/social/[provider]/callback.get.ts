interface SocialLoginResult {
  token?: string
  twoFactorRequired?: true
  challengeToken?: string
}

function readFlow(raw: string | undefined): SocialFlow | null {
  if (!raw) return null
  try {
    const flow = JSON.parse(raw) as SocialFlow
    return typeof flow.state === 'string' ? flow : null
  }
  catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const provider = getRouterParam(event, 'provider')
  const { code, state, error } = getQuery<{ code?: string, state?: string, error?: string }>(event)

  const flow = readFlow(getCookie(event, SOCIAL_STATE_COOKIE))
  deleteCookie(event, SOCIAL_STATE_COOKIE, { path: '/api/auth/social' })

  const returnTo = flow?.returnTo ?? '/'
  const fail = (reason: string) => sendRedirect(event, withSocialResult(returnTo, { social: 'error', reason, ...(isSocialProvider(provider) ? { provider } : {}) }))

  if (!isSocialProvider(provider)) return fail('unavailable')
  // The person pressed "Cancel" at the provider, or the state doesn't match what we issued.
  if (error || !code) return fail('cancelled')
  if (!state || !flow || state !== flow.state) return fail('failed')

  try {
    const result = await callApi<SocialLoginResult>(event, `/auth/social/${provider}`, {
      method: 'POST',
      // Laravel pins the redirect URI itself (config `services.*.redirect`); only the code travels.
      body: { code, reactivate: flow.reactivate },
      auth: false,
    })

    if (result.twoFactorRequired) {
      // The challenge stays in an httpOnly cookie: it never appears in the address bar, history or logs.
      setSocialPending(event, { kind: '2fa', token: result.challengeToken ?? '', remember: flow.remember })
      return sendRedirect(event, withSocialResult(returnTo, { social: '2fa' }))
    }

    setAuthToken(event, result.token!, flow.remember)
    return sendRedirect(event, withSocialResult(returnTo, { social: 'ok' }))
  }
  catch (e) {
    const data = (e as { data?: { code?: string, pendingToken?: string } }).data

    // A first-time sign-in has to accept the terms before an account exists.
    if (data?.code === 'terms_required' && data.pendingToken) {
      setSocialPending(event, { kind: 'terms', token: data.pendingToken, remember: flow.remember })
      return sendRedirect(event, withSocialResult(returnTo, { social: 'terms' }))
    }

    return fail(data?.code ?? 'failed')
  }
})
