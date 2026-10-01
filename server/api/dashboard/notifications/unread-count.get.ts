export default defineEventHandler((event): Promise<{ count: number }> => {
  return callApi<{ count: number }>(event, '/dashboard/notifications/unread-count')
})
