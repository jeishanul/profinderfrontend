export default defineEventHandler((event) => {
  return callApi(event, '/dashboard/notifications', { method: 'DELETE' })
})
