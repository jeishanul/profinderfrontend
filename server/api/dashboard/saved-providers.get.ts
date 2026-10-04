import type { SavedProvider, Paged } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<Paged<SavedProvider>> => {
  return callApi<Paged<SavedProvider>>(event, '/dashboard/saved-providers', { query: pickListQuery(getQuery(event)) })
})
