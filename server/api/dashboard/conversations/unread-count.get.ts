// `newApplicants` (new Seek Job applications on the consumer's open posts) rides along on this poll.
export default defineEventHandler((event): Promise<{ count: number, newApplicants?: number }> => {
  return callApi<{ count: number, newApplicants?: number }>(event, '/dashboard/conversations/unread-count')
})
