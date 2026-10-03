export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // `remember` is a browser-cookie concern, not something Laravel needs — see `login.post.ts`.
  const { remember, ...credentials } = body ?? {}

  const { token, user } = await callApi<{ token: string, user: unknown }>(event, '/auth/two-factor/challenge', {
    method: 'POST',
    body: credentials,
    auth: false,
  })

  setAuthToken(event, token, remember !== false)

  return user
})
