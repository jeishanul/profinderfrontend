/**
 * Landing pages whose address changed answer the old address with a permanent redirect, before Nuxt renders anything:
 * locations moved when the location data followed PSA's PSGC list (a province renamed, a town moved to a new province,
 * a barangay merged), and categories or sub-categories that were renamed or retired. Laravel keeps the old -> new table (`locations:sync`); the answer for each path is cached like
 * any other public read (server/utils/publicApi.ts). A failed lookup lets the page render (and 404) as before.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const path = landingPath(event.path)
  if (!path) return

  try {
    const { to } = await getPublicApi<{ to: string | null }>(event, '/seo/redirect', { path })
    if (to && to !== path) {
      const queryIndex = event.path.indexOf('?')
      return sendRedirect(event, to + (queryIndex >= 0 ? event.path.slice(queryIndex) : ''), 301)
    }
  }
  catch (error) {
    console.error('[location-redirects] lookup failed', error)
  }
})
