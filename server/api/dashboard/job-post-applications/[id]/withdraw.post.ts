import type { JobApplicationMine } from '#shared/types/jobPosts'

export default defineEventHandler((event) => {
  return callApi<JobApplicationMine>(event, `/dashboard/job-post-applications/${getRouterParam(event, 'id')}/withdraw`, { method: 'POST' })
})
