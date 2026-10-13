import type { Paged } from '#shared/types/dashboard'
import type { JobApplicationMine, JobApplicationMineListMeta } from '#shared/types/jobPosts'

export default defineEventHandler((event) => {
  return callApi<Paged<JobApplicationMine, JobApplicationMineListMeta>>(event, '/dashboard/job-post-applications', { query: pickListQuery(getQuery(event)) })
})
