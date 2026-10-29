import type { ShopCategory } from '#shared/types/shop'

// The storefront's category tree: the same for every visitor.
export default defineEventHandler((event): Promise<{ data: ShopCategory[] }> => {
  return getPublicApi<{ data: ShopCategory[] }>(event, '/shop/categories')
})
