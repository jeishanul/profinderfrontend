// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function callRoute(query: Record<string, unknown>) {
  const headers = vi.fn()
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getQuery', () => query)
  vi.stubGlobal('setResponseHeaders', headers)
  vi.stubGlobal('createError', (input: { statusCode: number }) => Object.assign(new Error('error'), input))
  vi.stubGlobal('QR_MAX_LENGTH', 512)
  vi.stubGlobal('qrSvg', (value: string) => `<svg>${value.length}</svg>`)

  const { default: handler } = await import('./qr.get') as { default: (event: unknown) => string }
  return { run: () => handler({}), headers }
}

describe('GET /api/qr', () => {
  it('answers an SVG that browsers may keep for a day', async () => {
    const { run, headers } = await callRoute({ value: 'https://profinder.vip' })

    expect(run()).toBe('<svg>21</svg>')
    expect(headers).toHaveBeenCalledWith({}, { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=86400' })
  })

  it('refuses a missing, repeated or oversized value', async () => {
    for (const value of [undefined, '', ['a', 'b'], 'x'.repeat(513)]) {
      const { run } = await callRoute({ value })
      expect(run).toThrow(expect.objectContaining({ statusCode: 400 }))
      vi.resetModules()
    }
  })
})
