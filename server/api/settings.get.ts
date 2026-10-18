import type { SiteSettings } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<SiteSettings> => {
  setResponseHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
  return callApi<SiteSettings>(event, '/settings', { auth: false })
})
