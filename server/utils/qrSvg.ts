import QRCode from 'qrcode'

/** Longest value `/api/qr` encodes: enough for any app-store or site link, small enough to keep encoding cheap. */
export const QR_MAX_LENGTH = 512

/**
 * A scannable QR code for `value` as a standalone SVG: one path, one 1×1 square per dark module. Built on the server
 * so the browser never downloads the QR encoder (it used to be preloaded on every page) and pages don't re-encode it
 * on every render. The SVG holds only numbers and fixed markup, never the encoded text itself.
 */
export function qrSvg(value: string): string {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  const { size, data } = qr.modules
  let path = ''
  for (let i = 0; i < size * size; i++) {
    if (data[i]) path += `M${i % size},${Math.floor(i / size)}h1v1h-1z`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path d="${path}" fill="#000"/></svg>`
}
