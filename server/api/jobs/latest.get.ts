import type { JobPostBase } from '#shared/types/jobPosts'

export default defineEventHandler((event): Promise<{ items: JobPostBase[], total: number }> => {
  return getPublicApi<{ items: JobPostBase[], total: number }>(event, '/jobs/latest')
})
