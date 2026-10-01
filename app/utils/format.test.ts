import { describe, expect, it } from 'vitest'
import { formatBadgeCount, formatDateTime, formatRelativeDate, fromDateTimeLocalValue, toDateTimeLocalValue } from './format'

describe('formatBadgeCount', () => {
  it('shows the exact count at or below 9', () => {
    expect(formatBadgeCount(0)).toBe('0')
    expect(formatBadgeCount(5)).toBe('5')
    expect(formatBadgeCount(9)).toBe('9')
  })

  it('caps anything above 9 at "9+"', () => {
    expect(formatBadgeCount(10)).toBe('9+')
    expect(formatBadgeCount(142)).toBe('9+')
  })
})

describe('datetime-local helpers', () => {
  it('round-trips a local date-time without shifting it to UTC', () => {
    const local = new Date(2026, 9, 5, 10, 30)

    expect(toDateTimeLocalValue(local)).toBe('2026-10-05T10:30')
    expect(fromDateTimeLocalValue('2026-10-05T10:30')).toBe(local.toISOString())
  })

  it('returns null for empty or invalid input', () => {
    expect(fromDateTimeLocalValue('')).toBeNull()
    expect(fromDateTimeLocalValue('not a date')).toBeNull()
  })

  it('formatDateTime includes both the date and the time', () => {
    const text = formatDateTime(new Date(2026, 9, 5, 10, 30), 'en-US')

    expect(text).toContain('Oct 5, 2026')
    expect(text).toMatch(/10:30/)
  })
})

describe('formatRelativeDate', () => {
  const now = new Date('2026-10-15T12:00:00Z')

  it('says "today" instead of "0 days ago"', () => {
    expect(formatRelativeDate('2026-10-15T08:00:00Z', 'en-US', now)).toBe('today')
  })

  it('uses days, then months, then years as the gap grows', () => {
    expect(formatRelativeDate('2026-10-12T12:00:00Z', 'en-US', now)).toBe('3 days ago')
    expect(formatRelativeDate('2026-07-15T12:00:00Z', 'en-US', now)).toBe('3 months ago')
    expect(formatRelativeDate('2024-10-15T12:00:00Z', 'en-US', now)).toBe('2 years ago')
  })

  it('never goes into the future for a slightly-ahead timestamp (clock skew)', () => {
    expect(formatRelativeDate('2026-10-15T12:00:30Z', 'en-US', now)).toBe('today')
  })
})
