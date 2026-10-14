export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return getPublicApi(event, '/seo/sitemap-urls', {
    type: query.type ? String(query.type) : undefined,
    page: query.page ? Number(query.page) : undefined,
    perPage: query.perPage ? Number(query.perPage) : undefined,
  })
})
