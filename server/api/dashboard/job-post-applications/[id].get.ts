import type { JobApplicant } from '#shared/types/jobPosts'

export default defineEventHandler((event) => {
  return callApi<JobApplicant>(event, `/dashboard/job-post-applications/${getRouterParam(event, 'id')}`)
})
