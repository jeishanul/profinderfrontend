import type { ProviderProfile } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<ProviderProfile> => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 404, statusMessage: 'Provider not found' })
  }

  // The owner sees their own unlisted profile, and the reviews carry whether *you* may reply: cached for visitors
  // without a session only.
  return getPublicApi<ProviderProfile>(event, `/providers/${id}`, {}, { viewerDependent: true })
})
