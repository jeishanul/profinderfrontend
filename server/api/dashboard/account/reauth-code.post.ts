export default defineEventHandler(async (event) => {
  return callApi(event, '/dashboard/account/reauth-code', { method: 'POST' })
})
