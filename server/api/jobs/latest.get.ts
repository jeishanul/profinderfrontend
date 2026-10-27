import type { JobPostBase } from '#shared/types/jobPosts'

export default defineEventHandler((event): Promise<{ items: JobPostBase[], total: number }> => {
  const { limit } = getQuery(event)

  return getPublicApi<{ items: JobPostBase[], total: number }>(event, '/jobs/latest', limit ? { limit } : {})
})
