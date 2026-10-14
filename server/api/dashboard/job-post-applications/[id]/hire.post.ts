import type { JobPost } from '#shared/types/jobPosts'

export default defineEventHandler(async (event) => {
  // `offerUpdatedAt` is the version of the offer the consumer was looking at; the API refuses if it has changed since.
  const body = await readBody<{ offerUpdatedAt?: string | null }>(event).catch(() => null)
  setResponseStatus(event, 201)
  return callApi<{ bookingId: string, conversationId: string, post: JobPost }>(event, `/dashboard/job-post-applications/${getRouterParam(event, 'id')}/hire`, {
    method: 'POST',
    body: body?.offerUpdatedAt ? { offerUpdatedAt: body.offerUpdatedAt } : undefined,
  })
})
