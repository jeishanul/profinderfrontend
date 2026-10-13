import type { JobPost } from '#shared/types/jobPosts'

export default defineEventHandler(async (event) => {
  const body = await readFormData(event)

  setResponseStatus(event, 201)
  return callApi<JobPost>(event, `/dashboard/job-posts/${getRouterParam(event, 'id')}/photos`, { method: 'POST', body })
})
