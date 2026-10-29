import type { ShopPlaceOrderResult } from '#shared/types/shop'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  setResponseStatus(event, 201)
  return callApi<ShopPlaceOrderResult>(event, '/dashboard/shop/orders', { method: 'POST', body })
})
