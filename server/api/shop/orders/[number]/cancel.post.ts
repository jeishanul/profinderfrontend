import type { ShopOrder } from '#shared/types/shop'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ reason?: unknown } | null>(event)

  return callApi<{ data: ShopOrder }>(event, `/dashboard/shop/orders/${getRouterParam(event, 'number')}/cancel`, { method: 'POST', body: { reason: body?.reason } })
})
