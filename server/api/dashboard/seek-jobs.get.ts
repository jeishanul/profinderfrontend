import type { Paged } from '#shared/types/dashboard'
import type { JobPostForProvider } from '#shared/types/jobPosts'

export default defineEventHandler((event) => {
  return callApi<Paged<JobPostForProvider>>(event, '/dashboard/seek-jobs', { query: pickSeekJobQuery(getQuery(event)) })
})
