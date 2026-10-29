import type { ShopProduct } from '#shared/types/shop'

export default defineEventHandler((event): Promise<{ data: ShopProduct }> => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  return getPublicApi<{ data: ShopProduct }>(event, `/shop/products/${slug}`)
})
