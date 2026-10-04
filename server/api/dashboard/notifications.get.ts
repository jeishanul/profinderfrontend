import type { NotificationItem } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<NotificationItem[]> => {
  const query = getQuery(event)

  return callApi<NotificationItem[]>(event, '/dashboard/notifications', { query: { limit: query.limit } })
})
