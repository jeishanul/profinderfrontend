import type { Invoice } from '#shared/types/billing'

// Choosing a plan creates (or returns the existing) unpaid invoice for it.
export default defineEventHandler((event) => {
  const id = encodeURIComponent(getRouterParam(event, 'id') ?? '')

  return callApi<{ data: Invoice }>(event, `/dashboard/billing/plans/${id}/purchase`, { method: 'POST' })
})
