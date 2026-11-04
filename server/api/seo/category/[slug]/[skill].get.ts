export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const skill = getRouterParam(event, 'skill')
  if (!slug || !skill) {
    throw createError({ statusCode: 400, statusMessage: 'Category and sub-category slugs required' })
  }

  return getPublicApi(event, `/seo/category/${encodeURIComponent(slug)}/${encodeURIComponent(skill)}`)
})
