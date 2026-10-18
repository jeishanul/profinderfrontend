import type { BlogPost } from '#shared/types/blog'

export default defineEventHandler((event): Promise<BlogPost> => {
  const slug = getRouterParam(event, 'slug')

  return getPublicApi<BlogPost>(event, `/blog/${slug}`)
})
