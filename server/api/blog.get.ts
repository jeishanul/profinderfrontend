import type { BlogPost } from '#shared/types/blog'
import type { Paged } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<Paged<BlogPost>> => {
  const query = getQuery(event)

  const apiQuery = {
    category: query.category || undefined,
    tag: query.tag || undefined,
    q: query.q || undefined,
    page: query.page,
    perPage: query.perPage,
  }

  return query.q
    ? callApi<Paged<BlogPost>>(event, '/blog', { query: apiQuery, auth: false })
    : getPublicApi<Paged<BlogPost>>(event, '/blog', apiQuery)
})
