import type { Paged } from '#shared/types/dashboard'
import type { ShopOrderListMeta, ShopOrderRow } from '#shared/types/shop'

export default defineEventHandler((event) => {
  return callApi<Paged<ShopOrderRow, ShopOrderListMeta>>(event, '/dashboard/shop/orders', { query: pickListQuery(getQuery(event)) })
})
