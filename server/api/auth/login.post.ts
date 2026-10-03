interface TwoFactorChallenge {
  twoFactorRequired: true
  challengeToken: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // `remember` is a browser-cookie concern, not something Laravel needs.
  const { remember, ...credentials } = body ?? {}

  const result = await callApi<{ token: string, user: unknown } | TwoFactorChallenge>(event, '/auth/login', {
    method: 'POST',
    body: credentials,
    auth: false,
  })

  if ('twoFactorRequired' in result) return result

  setAuthToken(event, result.token, remember !== false)

  return result.user
})
