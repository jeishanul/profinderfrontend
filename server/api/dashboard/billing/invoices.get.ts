import type { Paged } from '#shared/types/dashboard'
import type { InvoiceListMeta, InvoiceSummary } from '#shared/types/billing'

export default defineEventHandler((event) => {
  return callApi<Paged<InvoiceSummary, InvoiceListMeta>>(event, '/dashboard/billing/invoices', { query: pickListQuery(getQuery(event)) })
})
