// Starts (or retries) the PayPal payment of an unpaid invoice; the browser is then sent to `approveUrl`.
export default defineEventHandler((event) => {
  const number = encodeURIComponent(getRouterParam(event, 'number') ?? '')

  return callApi<{ approveUrl: string }>(event, `/dashboard/billing/invoices/${number}/paypal`, { method: 'POST' })
})
