import type { JobPostBase } from '#shared/types/jobPosts'

export default defineEventHandler((event): Promise<JobPostBase> => {
  const id = getRouterParam(event, 'id')

  return getPublicApi<JobPostBase>(event, `/jobs/${id}`)
})
