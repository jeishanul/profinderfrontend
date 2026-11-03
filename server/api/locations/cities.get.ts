import type { CityMunicipality } from '#shared/types/location'

/** `?province=` takes a province code or slug (Browse fills the picker from the URL's slugs). */
export default defineEventHandler(async (event): Promise<CityMunicipality[]> => {
  const province = getQuery(event).province
  if (typeof province !== 'string' || !province) return []
  return getPublicApi<CityMunicipality[]>(event, '/locations/cities', { province })
})
