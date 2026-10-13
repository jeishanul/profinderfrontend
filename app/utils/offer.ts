/** A money field typed with a currency symbol ("₱1,500"): everything but digits and the decimal point is dropped. */
export function parseAmount(value: string): number {
  return Number(value.replace(/[^\d.]/g, '')) || 0
}

/** Whole hours only (the server stores a small integer), capped at a day. */
export function parseWholeHours(value: string): number {
  return Math.min(24, Number(value.replace(/\D/g, '')) || 0)
}

/**
 * What is wrong with a price offer, if anything: a price above zero, at least an hour, and a date still ahead.
 * Shared by the chat quote form and the Seek Job application form, which ask for the same three things.
 */
export function offerProblem(offer: { price: number, hours: number, scheduledAt: string | null }, now: number = Date.now()): 'price' | 'hours' | 'date' | null {
  if (offer.price <= 0) return 'price'
  if (offer.hours < 1) return 'hours'
  if (!offer.scheduledAt || new Date(offer.scheduledAt).getTime() <= now) return 'date'
  return null
}

const DEFAULT_HOUR: Record<string, string> = { morning: '09:00', afternoon: '14:00', evening: '18:00', flexible: '09:00' }

/**
 * A starting point for "when would you do it": the post's preferred day at the time of day it asked for, as a
 * `datetime-local` value, or empty when that moment has already passed (or there is no preferred day).
 */
export function suggestedStart(preferredDate: string | null, preferredTime: string, now: number = Date.now()): string {
  if (!preferredDate) return ''
  const value = `${preferredDate}T${DEFAULT_HOUR[preferredTime] ?? '09:00'}`
  return new Date(value).getTime() > now ? value : ''
}
