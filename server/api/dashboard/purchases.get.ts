import type { PurchaseRecord, Paged, PurchaseListMeta } from '#shared/types/dashboard'

export default defineEventHandler((event): Promise<Paged<PurchaseRecord, PurchaseListMeta>> => {
  return callApi<Paged<PurchaseRecord, PurchaseListMeta>>(event, '/dashboard/purchases', { query: pickListQuery(getQuery(event)) })
})
