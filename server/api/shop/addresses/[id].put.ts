import type { ShopAddress } from '#shared/types/shop'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return callApi<{ data: ShopAddress }>(event, `/dashboard/shop/addresses/${getRouterParam(event, 'id')}`, { method: 'PUT', body })
})
