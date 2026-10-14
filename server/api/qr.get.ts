/**
 * `<UiQrCode>`'s image: the QR code for `?value=` as SVG (see `server/utils/qrSvg.ts`). Same input, same image, so
 * browsers keep it for a day.
 */
export default defineEventHandler((event) => {
  const value = getQuery(event).value

  if (typeof value !== 'string' || value === '' || value.length > QR_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'A value of 1 to 512 characters is required.' })
  }

  setResponseHeaders(event, {
    'content-type': 'image/svg+xml; charset=utf-8',
    'cache-control': 'public, max-age=86400',
  })

  return qrSvg(value)
})
