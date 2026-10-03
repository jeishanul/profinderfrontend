import type { ClientServed, Paged, ClientListMeta } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<Paged<ClientServed, ClientListMeta>> => {
  return callApi<Paged<ClientServed, ClientListMeta>>(event, '/dashboard/clients', { query: pickListQuery(getQuery(event)) })
})
