import type { JobPost, JobPostListMeta } from '#shared/types/jobPosts'
import type { Paged } from '#shared/types/dashboard'

export default defineEventHandler((event) => {
  return callApi<Paged<JobPost, JobPostListMeta>>(event, '/dashboard/job-posts', { query: pickListQuery(getQuery(event)) })
})
