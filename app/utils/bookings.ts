/**
 * Every `useApi` key whose data a booking change can make stale. After the
 * booking drawer starts/completes/cancels a job, these are refreshed so the
 * lists, KPIs and chat thread behind it stay in step.
 */
export const BOOKING_DATA_KEYS = [
  'dashboard-purchases',
  'dashboard-purchases-preview',
  'dashboard-clients',
  'dashboard-clients-preview',
  'dashboard-summary',
  'dashboard-conversations',
]
