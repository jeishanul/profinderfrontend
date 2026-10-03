import type { SiteSettings } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<SiteSettings> => {
  return callApi<SiteSettings>(event, '/settings')
})
