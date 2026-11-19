import type { SiteSettings } from '#shared/types/marketplace'

/**
 * Read on every page render (app.vue), so it is cached, but only briefly (`ttl: 'short'`, ~10 s): an admin's change
 * to branding or maintenance mode still shows almost at once. The browser must not keep its own copy.
 */
export default defineEventHandler((event): Promise<SiteSettings> => {
  setResponseHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
  return getPublicApi<SiteSettings>(event, '/settings', {}, { ttl: 'short' })
})
