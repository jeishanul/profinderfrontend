export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'Location path required' })
  }

  const parts = path.split('/').filter(Boolean)
  const [province, city, barangay] = parts
  if (!province) {
    throw createError({ statusCode: 400, statusMessage: 'Province slug required' })
  }

  const endpoint = (barangay && city)
    ? `/seo/location/${encodeURIComponent(province)}/${encodeURIComponent(city)}/${encodeURIComponent(barangay)}`
    : city
      ? `/seo/location/${encodeURIComponent(province)}/${encodeURIComponent(city)}`
      : `/seo/location/${encodeURIComponent(province)}`

  return getPublicApi(event, endpoint)
})
