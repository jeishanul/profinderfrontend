/**
 * Streams a job post photo from Laravel to the browser. The photos are private (they show a customer's home), and the
 * browser can't hold the API token, so this route adds the caller's credentials and pipes the file through.
 */
export default defineEventHandler(async (event) => {
  const token = getAuthToken(event)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Please log in.' })

  const config = useRuntimeConfig()
  const response = await $fetch.raw(`${config.apiBaseUrl}/api/v1/dashboard/job-posts/${getRouterParam(event, 'id')}/photos/${getRouterParam(event, 'photoId')}`, {
    responseType: 'stream',
    ignoreResponseError: true,
    headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
  })

  setResponseStatus(event, response.status)
  for (const header of ['content-type', 'content-disposition', 'content-length']) {
    const value = response.headers.get(header)
    if (value) setResponseHeader(event, header, value)
  }
  setResponseHeader(event, 'cache-control', 'private, no-store')
  setResponseHeader(event, 'x-content-type-options', 'nosniff')

  return sendStream(event, response.body as ReadableStream)
})
