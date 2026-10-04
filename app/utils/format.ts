export function formatDate(date: Date | string, locale = 'en-US'): string {
  const value = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value)
}

/** Caps a notification-style count badge at "9+" instead of ever growing unbounded. */
export function formatBadgeCount(count: number): string {
  return count > 9 ? '9+' : String(count)
}

/** "Oct 5, 2026, 10:00 AM" — a date with its time, in the viewer's locale. */
export function formatDateTime(date: Date | string, locale = 'en-US'): string {
  const value = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(value)
}

/**
 * Value for `<input type="datetime-local">` ("YYYY-MM-DDTHH:mm" in the
 * viewer's own timezone — `toISOString()` would shift it to UTC).
 */
export function toDateTimeLocalValue(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

/** Parses an `<input type="datetime-local">` value (local time) into an ISO instant, or `null` if empty/invalid. */
export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * "today", "3 days ago", "last month" — the coarsest unit that reads naturally,
 * in the viewer's locale. `now` is injectable so it can be tested.
 */
export function formatRelativeDate(date: Date | string, locale = 'en-US', now: Date = new Date()): string {
  const value = typeof date === 'string' ? new Date(date) : date
  const days = Math.floor((now.getTime() - value.getTime()) / 86_400_000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (days < 30) return formatter.format(-Math.max(0, days), 'day')
  if (days < 365) return formatter.format(-Math.floor(days / 30), 'month')
  return formatter.format(-Math.floor(days / 365), 'year')
}
