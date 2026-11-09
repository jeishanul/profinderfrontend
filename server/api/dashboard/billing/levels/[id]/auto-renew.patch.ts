import type { VerificationSubscription } from '#shared/types/billing'

export default defineEventHandler(async (event) => {
  const id = encodeURIComponent(getRouterParam(event, 'id') ?? '')
  const body = await readBody<{ autoRenew?: unknown } | null>(event)

  return callApi<{ data: VerificationSubscription }>(event, `/dashboard/billing/levels/${id}/auto-renew`, { method: 'PATCH', body: { autoRenew: body?.autoRenew === true } })
})
