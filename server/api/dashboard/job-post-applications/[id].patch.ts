import type { JobApplicationMine } from '#shared/types/jobPosts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return callApi<JobApplicationMine>(event, `/dashboard/job-post-applications/${getRouterParam(event, 'id')}`, { method: 'PATCH', body })
})
