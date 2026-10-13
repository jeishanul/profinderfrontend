import type { JobPost } from '#shared/types/jobPosts'

export default defineEventHandler((event) => {
  return callApi<JobPost>(event, `/dashboard/job-posts/${getRouterParam(event, 'id')}/photos/${getRouterParam(event, 'photoId')}`, { method: 'DELETE' })
})
