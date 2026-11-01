import { describe, expect, it } from 'vitest'
import {
  cartUnitCount,
  clampQuantity,
  mergeCartLines,
  parseShopListQuery,
  parseStoredCart,
  quantityBounds,
  removeCartLine,
  setCartLine,
  shopOrderStatusTone,
  toShopRouteQuery,
} from './shop'

describe('mergeCartLines', () => {
  it('sums quantities of the same SKU and appends new ones in order', () => {
    expect(mergeCartLines([{ sku: 'A', quantity: 1 }], [{ sku: 'B', quantity: 2 }, { sku: 'A', quantity: 3 }]))
      .toEqual([{ sku: 'A', quantity: 4 }, { sku: 'B', quantity: 2 }])
  })

  it('drops empty or negative lines and does not mutate the input', () => {
    const lines = [{ sku: 'A', quantity: 2 }]
    expect(mergeCartLines(lines, [{ sku: 'A', quantity: -5 }, { sku: 'C', quantity: 0 }])).toEqual([])
    expect(lines).toEqual([{ sku: 'A', quantity: 2 }])
  })
})

describe('setCartLine / removeCartLine', () => {
  it('sets, appends and removes', () => {
    const lines = [{ sku: 'A', quantity: 1 }]
    expect(setCartLine(lines, 'A', 5)).toEqual([{ sku: 'A', quantity: 5 }])
    expect(setCartLine(lines, 'B', 2)).toEqual([{ sku: 'A', quantity: 1 }, { sku: 'B', quantity: 2 }])
    expect(setCartLine(lines, 'A', 0)).toEqual([])
    expect(removeCartLine([{ sku: 'A', quantity: 1 }, { sku: 'B', quantity: 1 }], 'A')).toEqual([{ sku: 'B', quantity: 1 }])
  })

  it('counts units', () => {
    expect(cartUnitCount([{ sku: 'A', quantity: 2 }, { sku: 'B', quantity: 3 }])).toBe(5)
  })
})

describe('parseStoredCart', () => {
  it('ignores garbage and merges duplicates', () => {
    expect(parseStoredCart(null)).toEqual([])
    expect(parseStoredCart('not json')).toEqual([])
    expect(parseStoredCart('{"sku":"A"}')).toEqual([])
    expect(parseStoredCart(JSON.stringify([{ sku: 'A', quantity: 1 }, { sku: 'A', quantity: 2.7 }, { sku: 3 }, null, { sku: 'B', quantity: '2' }])))
      .toEqual([{ sku: 'A', quantity: 3 }])
  })
})

describe('quantity limits', () => {
  it('bounds by min, max and stock', () => {
    expect(quantityBounds({ minQty: 2, maxQty: 10, available: 4 })).toEqual({ min: 2, max: 4 })
    expect(quantityBounds({ minQty: 0, maxQty: null, available: null }).min).toBe(1)
  })

  it('clamps into range', () => {
    const limits = { minQty: 2, maxQty: 5, available: null }
    expect(clampQuantity(1, limits)).toBe(2)
    expect(clampQuantity(9, limits)).toBe(5)
    expect(clampQuantity(3.6, limits)).toBe(3)
    expect(clampQuantity(Number.NaN, limits)).toBe(2)
    expect(clampQuantity(4, { minQty: 3, maxQty: null, available: 1 })).toBe(3)
  })
})

describe('listing query', () => {
  it('parses and serialises without defaults', () => {
    expect(parseShopListQuery({})).toEqual({ q: '', sort: 'newest' })
    expect(parseShopListQuery({ q: ' mug ', sort: 'price_asc' })).toEqual({ q: 'mug', sort: 'price_asc' })
    expect(parseShopListQuery({ sort: 'cheapest' }).sort).toBe('newest')
    expect(toShopRouteQuery({ q: '', sort: 'newest' })).toEqual({})
    expect(toShopRouteQuery({ q: 'mug', sort: 'price_desc' })).toEqual({ q: 'mug', sort: 'price_desc' })
  })
})

describe('shopOrderStatusTone', () => {
  it('maps statuses to badge tones', () => {
    expect(shopOrderStatusTone('delivered')).toBe('primary')
    expect(shopOrderStatusTone('refunded')).toBe('danger')
    expect(shopOrderStatusTone('pending_payment')).toBe('accent')
    expect(shopOrderStatusTone('shipped')).toBe('neutral')
  })
})
