import type { Paged } from '#shared/types/dashboard'
import type { BillingTransaction } from '#shared/types/billing'

export default defineEventHandler((event) => {
  return callApi<Paged<BillingTransaction>>(event, '/dashboard/billing/transactions', { query: pickListQuery(getQuery(event)) })
})
