import type { Province } from '#shared/types/location'

// The same for every visitor: served from Nitro's shared cache (see server/utils/publicApi.ts).
export default defineEventHandler(async (event): Promise<Province[]> => {
  const provinces = await getPublicApi<Province[]>(event, '/locations/provinces')
  setBrowserCache(event, LOCATIONS_BROWSER_SECONDS)
  return provinces
})
