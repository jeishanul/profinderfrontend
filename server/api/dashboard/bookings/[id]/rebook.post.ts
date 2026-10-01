export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  return callApi(event, `/dashboard/bookings/${id}/rebook`, { method: 'POST' })
})
