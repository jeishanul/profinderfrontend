import type { ShopAddress } from '#shared/types/shop'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  setResponseStatus(event, 201)
  return callApi<{ data: ShopAddress }>(event, '/dashboard/shop/addresses', { method: 'POST', body })
})
