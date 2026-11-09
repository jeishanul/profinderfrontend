import type { BillingOverview } from '#shared/types/billing'

/** `useApi` key of `GET /dashboard/billing`; refresh it after anything that changes a level or an invoice. */
export const BILLING_OVERVIEW_KEY = 'dashboard-billing'

/**
 * The provider's verification levels, plans, gateways and unpaid count. Shared by the Billing page and the sidebar's
 * unpaid badge (one request, same key and options). Personal and provider-only, so browser-only and only fetched for
 * a provider account (`enabled`) — anyone else gets a 403 from the API.
 */
export function useBillingOverview(enabled: boolean) {
  return useApi<{ data: BillingOverview }>('/dashboard/billing', {
    key: BILLING_OVERVIEW_KEY,
    lazy: true,
    server: false,
    dedupe: 'defer',
    immediate: enabled,
  })
}
