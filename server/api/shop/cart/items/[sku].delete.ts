import type { ShopCartView } from '#shared/types/shop'

export default defineEventHandler((event) => {
  const sku = encodeURIComponent(getRouterParam(event, 'sku', { decode: true }) ?? '')

  return callApi<{ data: ShopCartView }>(event, `/dashboard/shop/cart/items/${sku}`, { method: 'DELETE' })
})
