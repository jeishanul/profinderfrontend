import type { ServiceCategory } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<ServiceCategory[]> => {
  const query = getQuery(event)

  return callApi<ServiceCategory[]>(event, '/categories', {
    query: { include: query.include === 'skills' ? 'skills' : undefined },
  })
})
