import type { JobApplicant } from '#shared/types/jobPosts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return callApi<JobApplicant>(event, `/dashboard/job-post-applications/${getRouterParam(event, 'id')}/decline`, { method: 'POST', body: body ?? {} })
})
