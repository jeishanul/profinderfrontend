import { describe, expect, it } from 'vitest'
import { currencySymbol, formatMoney } from './money'

describe('formatMoney', () => {
  it('uses the given currency symbol and groups thousands', () => {
    expect(formatMoney(1500, 'PHP', 'en-US')).toBe('₱1,500')
    expect(formatMoney(45, 'USD', 'en-US')).toBe('$45')
  })

  it('keeps cents only when there are some', () => {
    expect(formatMoney(12.5, 'USD', 'en-US')).toBe('$12.50')
    expect(formatMoney(12, 'USD', 'en-US')).toBe('$12')
  })

  it('does not throw for an invalid currency code', () => {
    expect(formatMoney(10, 'NOPE!', 'en-US')).toBe('NOPE! 10')
  })
})

describe('currencySymbol', () => {
  it('returns the bare symbol', () => {
    expect(currencySymbol('PHP', 'en-US')).toBe('₱')
    expect(currencySymbol('USD', 'en-US')).toBe('$')
  })

  it('falls back to the code for an invalid currency', () => {
    expect(currencySymbol('NOPE!', 'en-US')).toBe('NOPE!')
  })
})
