import type { Invoice } from '#shared/types/billing'

// "I paid by bank transfer": gateway + reference, and an optional receipt (multipart, forwarded as is).
export default defineEventHandler(async (event) => {
  const number = encodeURIComponent(getRouterParam(event, 'number') ?? '')
  const body = await readFormData(event)

  return callApi<{ data: Invoice }>(event, `/dashboard/billing/invoices/${number}/manual-payment`, { method: 'POST', body })
})
