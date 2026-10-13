export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event)
  return callApi(event, '/seo/popular-provinces', { query: { limit: limit ? Number(limit) : undefined } })
})
