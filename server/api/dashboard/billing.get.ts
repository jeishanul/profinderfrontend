import type { BillingOverview } from '#shared/types/billing'

// The provider's Billing page: verification levels, plans, gateways and the unpaid count (sidebar badge).
export default defineEventHandler((event) => {
  return callApi<{ data: BillingOverview }>(event, '/dashboard/billing')
})
