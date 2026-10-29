import type { ShopCartItemInput, ShopOrderStatus, ShopSort } from '#shared/types/shop'

/** Where a guest's cart lives in the browser (only `{ sku, quantity }` per line; prices always come from the server). */
export const SHOP_CART_STORAGE_KEY = 'pf_shop_cart'

export const SHOP_SORTS: readonly ShopSort[] = ['newest', 'price_asc', 'price_desc']

/** Largest quantity a single line may hold in the guest cart, whatever the product allows (keeps storage sane). */
const MAX_LINE_QUANTITY = 999

function normalQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0
  return Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.floor(quantity)))
}

/** Adds `extra` to `lines`: the same SKU sums its quantities, new SKUs are appended in order, empty lines dropped. */
export function mergeCartLines(lines: ShopCartItemInput[], extra: ShopCartItemInput[]): ShopCartItemInput[] {
  const result = lines.map(line => ({ ...line }))
  for (const item of extra) {
    const existing = result.find(line => line.sku === item.sku)
    if (existing) existing.quantity = normalQuantity(existing.quantity + item.quantity)
    else result.push({ sku: item.sku, quantity: normalQuantity(item.quantity) })
  }
  return result.filter(line => line.quantity > 0)
}

/** Sets one line's quantity (0 or less removes it; an unknown SKU is appended). */
export function setCartLine(lines: ShopCartItemInput[], sku: string, quantity: number): ShopCartItemInput[] {
  const next = normalQuantity(quantity)
  if (next <= 0) return removeCartLine(lines, sku)
  if (!lines.some(line => line.sku === sku)) return [...lines, { sku, quantity: next }]
  return lines.map(line => (line.sku === sku ? { sku, quantity: next } : line))
}

export function removeCartLine(lines: ShopCartItemInput[], sku: string): ShopCartItemInput[] {
  return lines.filter(line => line.sku !== sku)
}

/** Total units in the cart (what the header badge shows). */
export function cartUnitCount(lines: ShopCartItemInput[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0)
}

/** Reads the guest cart back from storage, ignoring anything malformed (it is user-editable). */
export function parseStoredCart(raw: string | null | undefined): ShopCartItemInput[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    const valid = value.filter((item): item is ShopCartItemInput =>
      !!item && typeof item === 'object'
      && typeof (item as ShopCartItemInput).sku === 'string' && (item as ShopCartItemInput).sku.length > 0
      && typeof (item as ShopCartItemInput).quantity === 'number')
    return mergeCartLines([], valid)
  }
  catch {
    return []
  }
}

export interface QuantityLimits {
  minQty: number
  maxQty: number | null
  /** Units in stock; `null` = unlimited. */
  available: number | null
}

/** The quantity range a line may hold: `[min, min(max, stock)]`. `max < min` means it can't be bought now. */
export function quantityBounds(limits: QuantityLimits): { min: number, max: number } {
  const min = Math.max(1, limits.minQty || 1)
  let max = Number.POSITIVE_INFINITY
  if (limits.maxQty !== null) max = Math.min(max, limits.maxQty)
  if (limits.available !== null) max = Math.min(max, limits.available)
  return { min, max: Math.min(max, MAX_LINE_QUANTITY) }
}

/** Pulls a quantity into the allowed range (stays at `min` when nothing can be bought). */
export function clampQuantity(quantity: number, limits: QuantityLimits): number {
  const { min, max } = quantityBounds(limits)
  const value = Number.isFinite(quantity) ? Math.floor(quantity) : min
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

export interface ShopListQuery {
  q: string
  sort: ShopSort
}

/** The storefront listing's filters from the URL (the URL is the source of truth). */
export function parseShopListQuery(query: Record<string, unknown>): ShopListQuery {
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const sort = SHOP_SORTS.includes(query.sort as ShopSort) ? (query.sort as ShopSort) : 'newest'
  return { q, sort }
}

/** Back to a URL query, leaving defaults out so the plain listing keeps a clean address. */
export function toShopRouteQuery(filters: ShopListQuery): Record<string, string> {
  return {
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.sort !== 'newest' ? { sort: filters.sort } : {}),
  }
}

/** Badge colour for an order status. */
export function shopOrderStatusTone(status: ShopOrderStatus): 'primary' | 'neutral' | 'accent' | 'danger' {
  switch (status) {
    case 'delivered': return 'primary'
    case 'cancelled':
    case 'refunded': return 'danger'
    case 'pending_payment':
    case 'pending': return 'accent'
    default: return 'neutral'
  }
}

/** The main path of an order through its life, for the timeline (the end states are shown when reached). */
export const SHOP_ORDER_FLOW: readonly ShopOrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
