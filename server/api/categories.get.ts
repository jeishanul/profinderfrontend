import type { ServiceCategory } from '#shared/types/marketplace'

export default defineEventHandler(async (event): Promise<ServiceCategory[]> => {
  const query = getQuery(event)

  const categories = await getPublicApi<ServiceCategory[]>(event, '/categories', { include: query.include === 'skills' ? 'skills' : undefined })
  setBrowserCache(event, PUBLIC_LIST_BROWSER_SECONDS)
  return categories
})
