import type { ShopCartView } from '#shared/types/shop'

// The guest cart from this browser, added to the account's cart right after login.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ items?: unknown }>(event)

  return callApi<{ data: ShopCartView }>(event, '/dashboard/shop/cart/merge', { method: 'POST', body: { items: body?.items ?? [] } })
})
