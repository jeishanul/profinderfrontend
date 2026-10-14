import type { PagedResult, Review } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<PagedResult<Review>> => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)

  // Each review says whether *you* may reply to it: cached for visitors without a session only.
  return getPublicApi<PagedResult<Review>>(event, `/providers/${id}/reviews`, { page: query.page, perPage: query.perPage }, { viewerDependent: true })
})
