import type { Testimonial } from '#shared/types/marketplace'

export default defineEventHandler(async (event): Promise<Testimonial[]> => {
  const items = await getPublicApi<Testimonial[]>(event, '/testimonials')
  setBrowserCache(event, PUBLIC_LIST_BROWSER_SECONDS)
  return items
})
