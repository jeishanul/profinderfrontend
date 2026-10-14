import type { FaqItem } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<FaqItem[]> => {
  return getPublicApi<FaqItem[]>(event, '/faqs')
})
