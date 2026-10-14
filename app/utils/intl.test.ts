import { describe, expect, it } from 'vitest'
import { cachedDateTimeFormat, cachedNumberFormat } from './intl'

describe('cached Intl formatters', () => {
  it('hands back the same formatter for the same locale and options, and a new one when they differ', () => {
    const a = cachedNumberFormat('en-US', { style: 'currency', currency: 'PHP' })

    expect(cachedNumberFormat('en-US', { style: 'currency', currency: 'PHP' })).toBe(a)
    expect(cachedNumberFormat('en-US', { style: 'currency', currency: 'USD' })).not.toBe(a)
    expect(cachedDateTimeFormat('en-US', { dateStyle: 'medium' })).toBe(cachedDateTimeFormat('en-US', { dateStyle: 'medium' }))
  })

  it('still throws for an invalid currency, and caches nothing for it', () => {
    expect(() => cachedNumberFormat('en-US', { style: 'currency', currency: 'NOPE!' })).toThrow()
    expect(() => cachedNumberFormat('en-US', { style: 'currency', currency: 'NOPE!' })).toThrow()
  })
})
