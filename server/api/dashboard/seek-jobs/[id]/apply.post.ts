import type { JobApplicationMine } from '#shared/types/jobPosts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  setResponseStatus(event, 201)
  return callApi<JobApplicationMine>(event, `/dashboard/seek-jobs/${getRouterParam(event, 'id')}/apply`, { method: 'POST', body })
})
