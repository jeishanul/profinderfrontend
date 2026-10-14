import type { JobPost } from '#shared/types/jobPosts'

// Optional `{ preferredDate }`: a post whose date has passed needs a new one to open again.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return callApi<JobPost>(event, `/dashboard/job-posts/${getRouterParam(event, 'id')}/reopen`, { method: 'POST', body: body ?? {} })
})
