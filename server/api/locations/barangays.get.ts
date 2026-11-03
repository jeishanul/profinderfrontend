import type { Barangay } from '#shared/types/location'

/** `?city=` takes a city code or slug. */
export default defineEventHandler(async (event): Promise<Barangay[]> => {
  const city = getQuery(event).city
  if (typeof city !== 'string' || !city) return []
  return getPublicApi<Barangay[]>(event, '/locations/barangays', { city })
})
