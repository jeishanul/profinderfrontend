import type { Invoice } from '#shared/types/billing'

export default defineEventHandler((event) => {
  const number = encodeURIComponent(getRouterParam(event, 'number') ?? '')

  return callApi<{ data: Invoice }>(event, `/dashboard/billing/invoices/${number}/cancel`, { method: 'POST' })
})
