import type { JobPost } from '#shared/types/jobPosts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return callApi<JobPost>(event, `/dashboard/job-posts/${getRouterParam(event, 'id')}`, { method: 'PATCH', body })
})
