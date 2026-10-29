import type { ShopOrder } from '#shared/types/shop'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: unknown }>(event)

  return callApi<{ data: ShopOrder }>(event, `/dashboard/shop/orders/${getRouterParam(event, 'number')}/paypal/capture`, { method: 'POST', body: { token: body?.token } })
})
