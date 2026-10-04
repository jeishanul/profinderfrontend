export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return callApi(event, '/auth/email/verify', { method: 'POST', body })
})
