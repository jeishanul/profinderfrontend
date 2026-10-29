import type { ShopCartView } from '#shared/types/shop'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ sku?: unknown, quantity?: unknown }>(event)

  return callApi<{ data: ShopCartView }>(event, '/dashboard/shop/cart/items', { method: 'PUT', body: { sku: body?.sku, quantity: body?.quantity } })
})
