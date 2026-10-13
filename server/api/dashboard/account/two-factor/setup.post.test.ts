// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

// Regression: this handler once dropped the request body, so the password the setup step needs never reached
// Laravel and every attempt came back as a validation error.
describe('POST /api/dashboard/account/two-factor/setup', () => {
  it('forwards the confirmation (password or emailed code) to the API', async () => {
    const callApi = vi.fn().mockResolvedValue({ secret: 's' })
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ verificationCode: '123456' }))
    vi.stubGlobal('callApi', callApi)

    const { default: handler } = await import('./setup.post') as { default: (event: unknown) => Promise<unknown> }
    await handler({})

    expect(callApi).toHaveBeenCalledWith({}, '/dashboard/account/two-factor/setup', { method: 'POST', body: { verificationCode: '123456' } })
  })
})
