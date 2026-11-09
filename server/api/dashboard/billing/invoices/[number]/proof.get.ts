/**
 * The receipt the provider uploaded for a bank transfer. Private, like chat attachments: this route adds the
 * caller's credentials and streams the file through without buffering it.
 */
export default defineEventHandler(async (event) => {
  const number = encodeURIComponent(getRouterParam(event, 'number') ?? '')
  const token = getAuthToken(event)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Please log in.' })

  const config = useRuntimeConfig()
  const response = await $fetch.raw(`${config.apiBaseUrl}/api/v1/dashboard/billing/invoices/${number}/proof`, {
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
