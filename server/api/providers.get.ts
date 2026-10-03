import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<PagedResult<ProviderSummary>> => {
  const query = getQuery(event)

  return callApi<PagedResult<ProviderSummary>>(event, '/providers', {
    query: {
      categories: Array.isArray(query.categories) ? query.categories.join(',') : (query.categories || undefined),
      minRating: query.minRating,
      verifiedOnly: query.verifiedOnly,
      minRate: query.minRate,
      maxRate: query.maxRate,
      province: query.province,
      city: query.city,
      barangay: query.barangay,
      q: query.q,
      sort: query.sort,
      skills: Array.isArray(query.skills) ? query.skills.join(',') : query.skills,
      availableDay: query.availableDay,
      page: query.page,
      perPage: query.perPage,
    },
  })
})
