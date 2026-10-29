import type { ShopOrder } from '#shared/types/shop'

export default defineEventHandler((event) => {
  return callApi<{ data: ShopOrder }>(event, `/dashboard/shop/orders/${getRouterParam(event, 'number')}`)
})
