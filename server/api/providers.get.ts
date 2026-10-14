import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<PagedResult<ProviderSummary>> => {
  const query = getQuery(event)

  const apiQuery = {
    categories: Array.isArray(query.categories) ? query.categories.join(',') : (query.categories || undefined),
    minRating: query.minRating,
    verifiedOnly: query.verifiedOnly,
    featuredOnly: query.featuredOnly,
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
  }

  // Filter/sort/page combinations are cached like any public list. Free-text searches are not: every phrasing would
  // get its own entry, and a cache that is almost never hit only costs memory.
  return query.q
    ? callApi<PagedResult<ProviderSummary>>(event, '/providers', { query: apiQuery })
    : getPublicApi<PagedResult<ProviderSummary>>(event, '/providers', apiQuery)
})
