export default defineEventHandler((event) => {
  return callApi<{ conversationId: string }>(event, `/dashboard/job-post-applications/${getRouterParam(event, 'id')}/conversation`, { method: 'POST' })
})
