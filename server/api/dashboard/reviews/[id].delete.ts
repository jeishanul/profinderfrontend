export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  return callApi(event, `/dashboard/reviews/${id}`, { method: 'DELETE' })
})
