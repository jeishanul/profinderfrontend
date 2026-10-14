import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import { qrSvg } from './qrSvg'

describe('qrSvg', () => {
  const value = 'https://play.google.com/store/apps/details?id=vip.profinder&hl=en'

  it('draws exactly one square per dark module of the code', () => {
    const { size, data } = QRCode.create(value, { errorCorrectionLevel: 'M' }).modules
    const dark = Array.from(data as ArrayLike<number>).filter(Boolean).length

    const svg = qrSvg(value)

    expect(svg).toContain(`viewBox="0 0 ${size} ${size}"`)
    expect(svg.match(/h1v1h-1z/g)).toHaveLength(dark)
  })

  it('is a standalone SVG that never contains the encoded text', () => {
    const svg = qrSvg('<script>alert(1)</script>')

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).not.toContain('script')
  })

  it('gives the same image for the same value (so it can be cached)', () => {
    expect(qrSvg(value)).toBe(qrSvg(value))
  })
})
