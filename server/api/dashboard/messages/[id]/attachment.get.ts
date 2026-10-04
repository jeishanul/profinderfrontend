/**
 * Streams a chat attachment from Laravel to the browser. Attachments are
 * private: the browser can't reach Laravel (or hold its token) directly, so
 * this route adds the caller's credentials and pipes the file through —
 * without buffering it, since videos can be tens of megabytes.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const token = getAuthToken(event)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Please log in.' })

  const config = useRuntimeConfig()
  const response = await $fetch.raw(`${config.apiBaseUrl}/api/v1/dashboard/messages/${id}/attachment`, {
    responseType: 'stream',
    ignoreResponseError: true,
    headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
  })

  setResponseStatus(event, response.status)
  for (const header of ['content-type', 'content-disposition', 'content-length']) {
    const value = response.headers.get(header)
    if (value) setResponseHeader(event, header, value)
  }
  // Private content: never let a shared cache keep it.
  setResponseHeader(event, 'cache-control', 'private, no-store')
  setResponseHeader(event, 'x-content-type-options', 'nosniff')

  return sendStream(event, response.body as ReadableStream)
})
