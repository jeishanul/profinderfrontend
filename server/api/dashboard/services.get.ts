import type { ServiceListing, Paged } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<Paged<ServiceListing>> => {
  return callApi<Paged<ServiceListing>>(event, '/dashboard/services', { query: pickListQuery(getQuery(event)) })
})
