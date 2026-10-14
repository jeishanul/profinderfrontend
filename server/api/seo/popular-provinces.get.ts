export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event)
  return getPublicApi(event, '/seo/popular-provinces', { limit: limit ? Number(limit) : undefined })
})
