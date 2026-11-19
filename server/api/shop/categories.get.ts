import type { ShopCategory } from '#shared/types/shop'

// The storefront's category tree: the same for every visitor.
export default defineEventHandler(async (event): Promise<{ data: ShopCategory[] }> => {
  const tree = await getPublicApi<{ data: ShopCategory[] }>(event, '/shop/categories')
  setBrowserCache(event, PUBLIC_LIST_BROWSER_SECONDS)
  return tree
})
