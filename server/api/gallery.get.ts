import type { GalleryItem, GalleryTab } from '#shared/types/marketplace'

const VALID_TABS: GalleryTab[] = ['home', 'recommended', 'trending']

export default defineEventHandler((event): Promise<GalleryItem[]> => {
  const query = getQuery(event)
  const tab = VALID_TABS.includes(query.tab as GalleryTab) ? (query.tab as GalleryTab) : 'home'

  return getPublicApi<GalleryItem[]>(event, '/gallery', { tab })
})
