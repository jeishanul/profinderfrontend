import type { GalleryItem, GalleryTab } from '#shared/types/marketplace'

const VALID_TABS: GalleryTab[] = ['home', 'recommended', 'trending']

export default defineEventHandler(async (event): Promise<GalleryItem[]> => {
  const query = getQuery(event)
  const tab = VALID_TABS.includes(query.tab as GalleryTab) ? (query.tab as GalleryTab) : 'home'

  const items = await getPublicApi<GalleryItem[]>(event, '/gallery', { tab })
  setBrowserCache(event, PUBLIC_LIST_BROWSER_SECONDS)
  return items
})
