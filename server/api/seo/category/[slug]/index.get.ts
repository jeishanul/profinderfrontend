export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Category slug required' })
  }

  return getPublicApi(event, `/seo/category/${encodeURIComponent(slug)}`)
})
