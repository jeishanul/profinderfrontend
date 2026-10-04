export default defineEventHandler((event) => {
  return callApi(event, '/auth/email/send', { method: 'POST' })
})
