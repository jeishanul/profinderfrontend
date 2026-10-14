// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type PublicApiModule = typeof import('./publicApi')

const callApi = vi.fn()
const cachedCall = vi.fn()
let token: string | undefined

async function load(): Promise<PublicApiModule> {
  vi.stubGlobal('defineCachedFunction', () => cachedCall)
  vi.stubGlobal('callApi', callApi)
  vi.stubGlobal('getAuthToken', () => token)
  return import('./publicApi')
}

beforeEach(() => {
  callApi.mockReset().mockResolvedValue('from laravel')
  cachedCall.mockReset().mockResolvedValue('from cache')
  token = undefined
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('publicApiCacheKey', () => {
  it('gives the same request the same key however its query was built', async () => {
    const { publicApiCacheKey } = await load()

    expect(publicApiCacheKey('/providers', { page: 2, sort: 'rating', q: undefined, city: '' }))
      .toBe(publicApiCacheKey('/providers', { sort: 'rating', page: '2' }))
  })

  it('keeps queries apart that only differ in punctuation (Nitro strips it from plain keys)', async () => {
    const { publicApiCacheKey } = await load()

    expect(publicApiCacheKey('/providers', { a: '1', b: '2' })).not.toBe(publicApiCacheKey('/providers', { a: '12', b: '' }))
    expect(publicApiCacheKey('/pages/terms')).not.toBe(publicApiCacheKey('/pages/term-s'))
  })
})

describe('getPublicApi', () => {
  it('serves shared data from the cache', async () => {
    const { getPublicApi } = await load()

    await expect(getPublicApi({} as never, '/home')).resolves.toBe('from cache')
    expect(callApi).not.toHaveBeenCalled()
  })

  it('serves a viewer-dependent page from the cache to visitors without a session', async () => {
    const { getPublicApi } = await load()

    await expect(getPublicApi({} as never, '/providers/7', {}, { viewerDependent: true })).resolves.toBe('from cache')
  })

  it('sends a signed-in viewer of a viewer-dependent page straight to Laravel, with their token', async () => {
    token = 'secret'
    const { getPublicApi } = await load()

    await expect(getPublicApi({} as never, '/providers/7', {}, { viewerDependent: true })).resolves.toBe('from laravel')
    expect(cachedCall).not.toHaveBeenCalled()
    // No `auth: false`: callApi attaches the visitor's token as for any personal request.
    expect(callApi).toHaveBeenCalledWith({}, '/providers/7', { query: {} })
  })
})
