import type { ShopCartView } from '#shared/types/shop'

// Prices a guest's cart (kept in their browser). Not cached: the answer depends on the posted lines and live stock.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ items?: unknown }>(event)

  return callApi<{ data: ShopCartView }>(event, '/shop/cart/quote', { method: 'POST', body: { items: body?.items ?? [] }, auth: false })
})
