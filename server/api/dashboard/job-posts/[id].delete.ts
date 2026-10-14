export default defineEventHandler(async (event) => {
  await callApi(event, `/dashboard/job-posts/${getRouterParam(event, 'id')}`, { method: 'DELETE' })

  setResponseStatus(event, 204)
  return null
})
