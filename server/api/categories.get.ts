import type { ServiceCategory } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<ServiceCategory[]> => {
  const query = getQuery(event)

  return getPublicApi<ServiceCategory[]>(event, '/categories', { include: query.include === 'skills' ? 'skills' : undefined })
})
