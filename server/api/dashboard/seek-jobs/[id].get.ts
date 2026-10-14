import type { JobApplicationMine, JobPostForProvider } from '#shared/types/jobPosts'

export default defineEventHandler((event) => {
  return callApi<JobPostForProvider & { myApplication: JobApplicationMine | null }>(event, `/dashboard/seek-jobs/${getRouterParam(event, 'id')}`)
})
