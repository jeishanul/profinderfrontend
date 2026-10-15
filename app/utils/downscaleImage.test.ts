import { afterEach, describe, expect, it, vi } from 'vitest'
import { downscaleImage } from './downscaleImage'

function fakeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() }
}

/** A canvas that "encodes" to a blob of `size` bytes in whatever type it was asked for, recording its dimensions. */
function stubCanvas(size: number) {
  const drawn: Array<{ width: number, height: number, type: string }> = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback, type) {
    drawn.push({ width: this.width, height: this.height, type: type ?? '' })
    callback(new Blob([new Uint8Array(size)], { type }))
  })
  return drawn
}

const MB = 1024 * 1024

describe('downscaleImage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shrinks a big photo to 2560 px on the long side and sends it as JPEG', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(fakeBitmap(4000, 3000)))
    const drawn = stubCanvas(900_000)

    const result = await downscaleImage(new File([new Uint8Array(8 * MB)], 'holiday.heic', { type: 'image/heic' }))

    expect(drawn).toEqual([{ width: 2560, height: 1920, type: 'image/jpeg' }])
    expect(result.name).toBe('holiday.jpg')
    expect(result.type).toBe('image/jpeg')
    expect(result.size).toBe(900_000)
  })

  it('keeps a PNG transparent by re-encoding it as WebP', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(fakeBitmap(3000, 1000)))
    const drawn = stubCanvas(500_000)

    const result = await downscaleImage(new File([new Uint8Array(4 * MB)], 'logo.png', { type: 'image/png' }))

    expect(drawn[0]?.type).toBe('image/webp')
    expect(result.name).toBe('logo.webp')
  })

  it('sends small photos, GIFs and non-images as picked', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(fakeBitmap(1200, 800)))
    stubCanvas(10)

    const small = new File([new Uint8Array(500_000)], 'small.jpg', { type: 'image/jpeg' })
    const gif = new File([new Uint8Array(4 * MB)], 'funny.gif', { type: 'image/gif' })
    const pdf = new File([new Uint8Array(4 * MB)], 'doc.pdf', { type: 'application/pdf' })

    expect(await downscaleImage(small)).toBe(small)
    expect(await downscaleImage(gif)).toBe(gif)
    expect(await downscaleImage(pdf)).toBe(pdf)
  })

  it('keeps the original when re-encoding would not make it smaller', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(fakeBitmap(3000, 2000)))
    stubCanvas(3 * MB)
    const file = new File([new Uint8Array(2 * MB)], 'sharp.jpg', { type: 'image/jpeg' })

    expect(await downscaleImage(file)).toBe(file)
  })

  it('falls back to the original when the browser cannot decode the file', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new DOMException('decode failed')))
    const file = new File([new Uint8Array(4 * MB)], 'photo.heic', { type: 'image/heic' })

    expect(await downscaleImage(file)).toBe(file)
  })
})
