export default defineEventHandler((event) => {
  return callApi(event, '/dashboard/notifications/read-all', { method: 'PATCH' })
})
