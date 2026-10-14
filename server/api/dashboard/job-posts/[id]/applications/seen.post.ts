export default defineEventHandler(async (event) => {
  await callApi(event, `/dashboard/job-posts/${getRouterParam(event, 'id')}/applications/seen`, { method: 'POST' })

  setResponseStatus(event, 204)
  return null
})
