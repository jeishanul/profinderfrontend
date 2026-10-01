/**
 * Formats an amount in the platform currency ("₱1,500", "$45.50"). Whole
 * amounts drop the decimals; fractional ones keep two. The currency comes
 * from the admin's Settings (see `useSiteSettings`), not a hardcoded "$".
 */
export function formatMoney(amount: number, currency = 'PHP', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  catch {
    // An unknown/typo'd currency code in Settings must not break every page.
    return `${currency} ${amount}`
  }
}

/** Just the symbol ("₱", "$") — for inputs that show a prefix next to a bare number. */
export function currencySymbol(currency = 'PHP', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0).find(part => part.type === 'currency')?.value ?? currency
  }
  catch {
    return currency
  }
}
