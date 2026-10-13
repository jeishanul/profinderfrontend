interface CompleteResult {
  token?: string
  user?: unknown
}

/** Second step of a first-time social sign-in: the person accepted the terms, so the account can be created. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ acceptTerms?: boolean }>(event)
  const pending = readSocialPending(event, 'terms')

  if (!pending) {
    throw createError({ statusCode: 422, statusMessage: 'This sign-in has expired. Please start again.', data: { code: 'social_expired' } })
  }

  const result = await callApi<CompleteResult & { twoFactorRequired?: true, challengeToken?: string }>(event, '/auth/social/complete', {
    method: 'POST',
    body: { pendingToken: pending.token, acceptTerms: body?.acceptTerms === true },
    auth: false,
  })

  if (result.twoFactorRequired) {
    setSocialPending(event, { kind: '2fa', token: result.challengeToken ?? '', remember: pending.remember })
    return { twoFactorRequired: true }
  }

  clearSocialPending(event)
  setAuthToken(event, result.token!, pending.remember)
  return result.user
})
