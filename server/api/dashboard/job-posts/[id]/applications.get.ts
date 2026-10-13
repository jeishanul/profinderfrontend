import type { Paged } from '#shared/types/dashboard'
import type { JobApplicant, JobApplicantListMeta } from '#shared/types/jobPosts'

export default defineEventHandler((event) => {
  return callApi<Paged<JobApplicant, JobApplicantListMeta>>(event, `/dashboard/job-posts/${getRouterParam(event, 'id')}/applications`, { query: pickListQuery(getQuery(event)) })
})
