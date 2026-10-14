// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function callMe(callApi: ReturnType<typeof vi.fn>) {
  const clearAuthToken = vi.fn()
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getAuthToken', () => 'token')
  vi.stubGlobal('clearAuthToken', clearAuthToken)
  vi.stubGlobal('callApi', callApi)

  const { default: handler } = await import('./me.get') as { default: (event: unknown) => Promise<unknown> }
  return { result: await handler({}), clearAuthToken }
}

// Regression: any failure used to clear the login cookie, so an API timeout logged people out.
describe('GET /api/auth/me', () => {
  it('keeps the login cookie when the API times out, and renders the page as logged out', async () => {
    const { result, clearAuthToken } = await callMe(vi.fn().mockRejectedValue({ statusCode: 504 }))

    expect(result).toBeNull()
    expect(clearAuthToken).not.toHaveBeenCalled()
  })

  it('returns the user when the API answers', async () => {
    const { result } = await callMe(vi.fn().mockResolvedValue({ id: '1' }))

    expect(result).toEqual({ id: '1' })
  })
})
