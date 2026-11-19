import type { Barangay } from '#shared/types/location'

/** `?city=` takes a city code or slug. */
export default defineEventHandler(async (event): Promise<Barangay[]> => {
  const city = getQuery(event).city
  if (typeof city !== 'string' || !city) return []
  const barangays = await getPublicApi<Barangay[]>(event, '/locations/barangays', { city })
  setBrowserCache(event, LOCATIONS_BROWSER_SECONDS)
  return barangays
})
