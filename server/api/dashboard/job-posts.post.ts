import type { JobPost } from '#shared/types/jobPosts'

// Multipart: photos can ride along with the post.
export default defineEventHandler(async (event) => {
  const body = await readFormData(event)

  setResponseStatus(event, 201)
  return callApi<JobPost>(event, '/dashboard/job-posts', { method: 'POST', body })
})
