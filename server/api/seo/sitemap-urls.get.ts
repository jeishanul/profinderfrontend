export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return callApi(event, '/seo/sitemap-urls', {
    query: {
      type: query.type ? String(query.type) : undefined,
      page: query.page ? Number(query.page) : undefined,
      perPage: query.perPage ? Number(query.perPage) : undefined,
    },
  })
})
