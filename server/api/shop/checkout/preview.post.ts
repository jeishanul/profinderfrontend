import type { ShopCheckoutPreview } from '#shared/types/shop'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return callApi<{ data: ShopCheckoutPreview }>(event, '/dashboard/shop/checkout/preview', { method: 'POST', body })
})
