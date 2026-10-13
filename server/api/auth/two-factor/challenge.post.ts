export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // `remember` is a browser-cookie concern, not something Laravel needs — see `login.post.ts`.
  const { remember, ...credentials } = body ?? {}

  // A challenge that came from a social sign-in lives in an httpOnly cookie rather than in the page.
  const pending = credentials.challengeToken ? null : readSocialPending(event, '2fa')
  const payload = pending ? { ...credentials, challengeToken: pending.token } : credentials

  const { token, user } = await callApi<{ token: string, user: unknown }>(event, '/auth/two-factor/challenge', {
    method: 'POST',
    body: payload,
    auth: false,
  })

  if (pending) clearSocialPending(event)
  setAuthToken(event, token, pending ? pending.remember : remember !== false)

  return user
})
