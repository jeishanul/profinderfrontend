import type { FaqItem } from '#shared/types/marketplace'

export default defineEventHandler(async (event): Promise<FaqItem[]> => {
  const items = await getPublicApi<FaqItem[]>(event, '/faqs')
  setBrowserCache(event, PUBLIC_LIST_BROWSER_SECONDS)
  return items
})
