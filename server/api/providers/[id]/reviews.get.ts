import type { PagedResult, Review } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<PagedResult<Review>> => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)

  return callApi<PagedResult<Review>>(event, `/providers/${id}/reviews`, {
    query: { page: query.page, perPage: query.perPage },
  })
})
