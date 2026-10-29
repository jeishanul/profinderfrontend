import type { ShopCartView } from '#shared/types/shop'

export default defineEventHandler((event) => {
  return callApi<{ data: ShopCartView }>(event, '/dashboard/shop/cart')
})
