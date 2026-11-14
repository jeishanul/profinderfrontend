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

/**
 * Re-read everything that shows where a pro stands with verification: the Verification tab and the sidebar's
 * "Pending" tag (`dashboard-kyc`), the Billing levels and the dashboard banner. Call it after anything that can change
 * Level 1 (email verified, profile saved, photo uploaded) or a badge (document sent, level bought or paid).
 */
export function refreshVerificationState() {
  return refreshNuxtData(['dashboard-kyc', BILLING_OVERVIEW_KEY, 'dashboard-summary'])
}
