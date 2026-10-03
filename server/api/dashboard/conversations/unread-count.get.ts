export default defineEventHandler((event): Promise<{ count: number }> => {
  return callApi<{ count: number }>(event, '/dashboard/conversations/unread-count')
})
