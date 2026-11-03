import type { Province } from '#shared/types/location'

// The same for every visitor: served from Nitro's shared cache (see server/utils/publicApi.ts).
export default defineEventHandler(event => getPublicApi<Province[]>(event, '/locations/provinces'))
