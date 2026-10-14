import type { Testimonial } from '#shared/types/marketplace'

export default defineEventHandler((event): Promise<Testimonial[]> => {
  return getPublicApi<Testimonial[]>(event, '/testimonials')
})
