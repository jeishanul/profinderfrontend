import type { StaticPageContent } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<StaticPageContent> => {
  const slug = getRouterParam(event, 'slug')

  return getPublicApi<StaticPageContent>(event, `/pages/${slug}`)
})
