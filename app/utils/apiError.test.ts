import { describe, expect, it } from 'vitest'
import { apiErrorCode, apiErrorMessage, apiErrorStatus, apiFieldErrors } from './apiError'

/** What the browser really receives: the Nitro BFF wraps Laravel's body in `data`. */
function bffError(laravel: Record<string, unknown>, statusCode = 422) {
  return { statusCode, data: { statusCode, statusMessage: String(laravel.message ?? ''), message: String(laravel.message ?? ''), data: laravel } }
}

describe('apiError helpers', () => {
  it('prefers the server message, else the fallback', () => {
    expect(apiErrorMessage(bffError({ message: 'Quote expired' }), 'Failed')).toBe('Quote expired')
    expect(apiErrorMessage({ data: {} }, 'Failed')).toBe('Failed')
    expect(apiErrorMessage(null, 'Failed')).toBe('Failed')
  })

  it('still reads a flat message', () => {
    expect(apiErrorMessage({ data: { message: 'Quote expired' } }, 'Failed')).toBe('Quote expired')
  })

  it('keeps the first message per field from the wrapped Laravel body', () => {
    const error = bffError({ message: 'Invalid', errors: { email: ['Taken', 'Other'], name: [] } })
    expect(apiFieldErrors(error)).toEqual({ email: 'Taken' })
    expect(apiFieldErrors(undefined)).toEqual({})
  })

  it('also understands a flat errors object', () => {
    expect(apiFieldErrors({ data: { errors: { email: ['Taken'] } } })).toEqual({ email: 'Taken' })
  })

  it('reads the machine code from the wrapped body', () => {
    expect(apiErrorCode(bffError({ message: 'x', code: 'email_unverified' }, 403))).toBe('email_unverified')
    expect(apiErrorCode({ data: {} })).toBeUndefined()
  })

  it('reads the status from either shape', () => {
    expect(apiErrorStatus({ statusCode: 422 })).toBe(422)
    expect(apiErrorStatus({ status: 401 })).toBe(401)
  })
})
