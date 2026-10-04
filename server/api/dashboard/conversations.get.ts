import type { Conversation, Paged } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<Paged<Conversation>> => {
  return callApi<Paged<Conversation>>(event, '/dashboard/conversations', { query: pickListQuery(getQuery(event)) })
})
