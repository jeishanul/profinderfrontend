import type { Conversation } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<Conversation> => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)

  return callApi<Conversation>(event, `/dashboard/conversations/${id}`, { query: { before: query.before, limit: query.limit } })
})
