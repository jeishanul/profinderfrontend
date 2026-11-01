// Starts (or retries) the PayPal payment of an unpaid order; the browser is then sent to `approveUrl`.
export default defineEventHandler((event) => {
  return callApi<{ approveUrl: string }>(event, `/dashboard/shop/orders/${getRouterParam(event, 'number')}/paypal`, { method: 'POST' })
})
