import { describe, expect, it } from 'vitest'
import { offerProblem, parseAmount, parseWholeHours, suggestedStart } from './offer'

describe('parseAmount / parseWholeHours', () => {
  it('reads a money field typed with a symbol and separators', () => {
    expect(parseAmount('₱1,500.50')).toBe(1500.5)
    expect(parseAmount('abc')).toBe(0)
  })

  it('keeps whole hours, capped at a day', () => {
    expect(parseWholeHours('4h')).toBe(4)
    expect(parseWholeHours('99')).toBe(24)
    expect(parseWholeHours('')).toBe(0)
  })
})

describe('offerProblem', () => {
  const now = new Date('2026-10-14T10:00:00Z').getTime()
  const ok = { price: 1500, hours: 4, scheduledAt: '2026-10-16T09:00:00Z' }

  it('accepts a complete offer', () => {
    expect(offerProblem(ok, now)).toBeNull()
  })

  it('names the first thing that is wrong', () => {
    expect(offerProblem({ ...ok, price: 0 }, now)).toBe('price')
    expect(offerProblem({ ...ok, hours: 0 }, now)).toBe('hours')
    expect(offerProblem({ ...ok, scheduledAt: null }, now)).toBe('date')
    expect(offerProblem({ ...ok, scheduledAt: '2026-10-14T09:00:00Z' }, now)).toBe('date')
    expect(offerProblem({ price: 0, hours: 0, scheduledAt: null }, now)).toBe('price')
  })
})

describe('suggestedStart', () => {
  const now = new Date('2026-10-14T10:00:00').getTime()

  it('proposes the preferred day at the requested time of day', () => {
    expect(suggestedStart('2026-10-20', 'morning', now)).toBe('2026-10-20T09:00')
    expect(suggestedStart('2026-10-20', 'afternoon', now)).toBe('2026-10-20T14:00')
    expect(suggestedStart('2026-10-20', 'evening', now)).toBe('2026-10-20T18:00')
    expect(suggestedStart('2026-10-20', 'flexible', now)).toBe('2026-10-20T09:00')
  })

  it('proposes nothing without a day, or when that moment has passed', () => {
    expect(suggestedStart(null, 'morning', now)).toBe('')
    expect(suggestedStart('2026-10-13', 'morning', now)).toBe('')
    expect(suggestedStart('2026-10-14', 'morning', now)).toBe('')
  })
})
