import type { Invoice } from '#shared/types/billing'

export default defineEventHandler(async (event) => {
  const number = encodeURIComponent(getRouterParam(event, 'number') ?? '')
  const body = await readBody<{ token?: unknown } | null>(event)

  return callApi<{ data: Invoice }>(event, `/dashboard/billing/invoices/${number}/paypal/capture`, { method: 'POST', body: { token: body?.token } })
})
