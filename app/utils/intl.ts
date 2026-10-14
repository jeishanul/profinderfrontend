/**
 * Reused `Intl` formatters. Constructing an `Intl.*Format` is the expensive part (it resolves locale data); using one
 * is cheap. Prices and dates are formatted many times per page, on the server for every render, so each helper here
 * returns the same formatter for the same locale and options instead of building one per call.
 *
 * Module-level on purpose: a formatter depends only on its locale and options, never on who is asking, so sharing it
 * between requests is safe (unlike request state, which must never live at module level, see CLAUDE.md). The keys are
 * a handful of locale/option combinations; the cap only guards against a bug that would generate endless new ones.
 * A constructor that throws (an unknown currency code) caches nothing and the error reaches the caller as before.
 */
const formatters = new Map<string, unknown>()
const MAX_FORMATTERS = 200

function reuse<T>(key: string, create: () => T): T {
  const existing = formatters.get(key) as T | undefined
  if (existing) return existing

  const formatter = create()
  if (formatters.size >= MAX_FORMATTERS) formatters.clear()
  formatters.set(key, formatter)
  return formatter
}

export function cachedNumberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  return reuse(`number|${locale}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(locale, options))
}

export function cachedDateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return reuse(`date|${locale}|${JSON.stringify(options)}`, () => new Intl.DateTimeFormat(locale, options))
}

export function cachedRelativeTimeFormat(locale: string, options: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat {
  return reuse(`relative|${locale}|${JSON.stringify(options)}`, () => new Intl.RelativeTimeFormat(locale, options))
}
