export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  // Optional `{ reason }`; an empty body is fine.
  const body = await readBody(event)

  return callApi(event, `/dashboard/quotes/${id}/decline`, { method: 'PATCH', body })
})
