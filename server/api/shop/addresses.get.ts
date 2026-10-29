import type { ShopAddress } from '#shared/types/shop'

export default defineEventHandler((event) => {
  return callApi<{ data: ShopAddress[] }>(event, '/dashboard/shop/addresses')
})
