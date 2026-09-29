export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  return callApi(event, `/dashboard/conversations/${id}/archive`, { method: 'PATCH' })
})
