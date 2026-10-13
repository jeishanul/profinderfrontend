import { describe, expect, it, vi } from 'vitest'
import { createCallApi } from './apiProxy'
import type { ApiProxyDeps } from './apiProxy'

function setup(options: { fetch?: ReturnType<typeof vi.fn> } = {}) {
  const fetchMock = options.fetch ?? vi.fn().mockResolvedValue({ ok: true })
  const deps = {
    apiBaseUrl: () => 'http://api.test',
    fetch: fetchMock,
    getAuthToken: vi.fn(() => 'secret-token'),
    clearAuthToken: vi.fn(),
    getClientIp: vi.fn(() => '203.0.113.9'),
    createError: vi.fn((input: { statusCode: number, statusMessage: string, data?: unknown }) => Object.assign(new Error(input.statusMessage), input)),
  }
  return { deps, fetchMock, callApi: createCallApi(deps as ApiProxyDeps) }
}

describe('callApi', () => {
  it('sends the body, the visitor\'s address and their bearer token to Laravel', async () => {
    const { fetchMock, callApi } = setup()

    await callApi({} as never, '/dashboard/account/two-factor/setup', { method: 'POST', body: { password: 'pw' } })

    const [path, options] = fetchMock.mock.calls[0]! as [string, { baseURL: string, body: unknown, headers: Record<string, string> }]
    expect(path).toBe('/dashboard/account/two-factor/setup')
    expect(options.baseURL).toBe('http://api.test/api/v1')
    expect(options.body).toEqual({ password: 'pw' })
    expect(options.headers['X-Forwarded-For']).toBe('203.0.113.9')
    expect(options.headers.Authorization).toBe('Bearer secret-token')
  })

  it('sends no token when the route opts out of authentication', async () => {
    const { deps, fetchMock, callApi } = setup()

    await callApi({} as never, '/auth/login', { method: 'POST', auth: false })

    expect(deps.getAuthToken).not.toHaveBeenCalled()
    const [, options] = fetchMock.mock.calls[0]! as [string, { headers: Record<string, string> }]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('drops the auth cookie when the API says the token is no good', async () => {
    const { deps, callApi } = setup({ fetch: vi.fn().mockRejectedValue({ response: { status: 401, _data: { message: 'Unauthenticated.' } } }) })

    await expect(callApi({} as never, '/dashboard/account')).rejects.toMatchObject({ statusCode: 401 })
    expect(deps.clearAuthToken).toHaveBeenCalledTimes(1)
  })

  it('keeps the cookie on other failures and passes the API body through', async () => {
    const { deps, callApi } = setup({ fetch: vi.fn().mockRejectedValue({ response: { status: 422, _data: { message: 'Bad', errors: { password: ['x'] } } } }) })

    await expect(callApi({} as never, '/x')).rejects.toMatchObject({ statusCode: 422, data: { errors: { password: ['x'] } } })
    expect(deps.clearAuthToken).not.toHaveBeenCalled()
  })

  it('does not clear the cookie for a 401 on a request that never sent one', async () => {
    const { deps, callApi } = setup({ fetch: vi.fn().mockRejectedValue({ response: { status: 401, _data: {} } }) })

    await expect(callApi({} as never, '/auth/login', { auth: false })).rejects.toMatchObject({ statusCode: 401 })
    expect(deps.clearAuthToken).not.toHaveBeenCalled()
  })

  it('turns a network failure with no response into a 500', async () => {
    const { callApi } = setup({ fetch: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) })

    await expect(callApi({} as never, '/x')).rejects.toMatchObject({ statusCode: 500 })
  })
})
