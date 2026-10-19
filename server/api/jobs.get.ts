import type { JobPostBase } from '#shared/types/jobPosts'
import type { Paged } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<Paged<JobPostBase>> => {
  const query = getQuery(event)

  const apiQuery = {
    category: query.category || undefined,
    province: query.province || undefined,
    city: query.city || undefined,
    budgetMin: query.budgetMin || undefined,
    q: query.q || undefined,
    sort: query.sort || undefined,
    page: query.page,
    perPage: query.perPage,
  }

  return query.q
    ? callApi<Paged<JobPostBase>>(event, '/jobs', { query: apiQuery, auth: false })
    : getPublicApi<Paged<JobPostBase>>(event, '/jobs', apiQuery)
})
