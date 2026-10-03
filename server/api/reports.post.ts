export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return callApi(event, '/reports', { method: 'POST', body })
})
