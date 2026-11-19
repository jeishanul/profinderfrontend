// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

const setResponseHeader = vi.fn()

async function load() {
  vi.stubGlobal('setResponseHeader', setResponseHeader)
  return import('./browserCache')
}

afterEach(() => {
  setResponseHeader.mockReset()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('setBrowserCache', () => {
  it('lets browsers reuse a public answer, then serve it stale while revalidating', async () => {
    const { setBrowserCache } = await load()

    setBrowserCache({} as never, 60)

    expect(setResponseHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  })
})
