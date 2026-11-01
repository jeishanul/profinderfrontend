import { describe, expect, it } from 'vitest'
import type { ShopAttribute, ShopVariant } from '#shared/types/shop'
import { initialSelection, isValueAvailable, isValueSelectable, pickValue, resolveVariant, variantImageIndex } from './shopVariants'

// Size: S=1, M=2 · Color: Red=10, Blue=11. No S/Blue variant; M/Red is out of stock.
const attributes: ShopAttribute[] = [
  { slug: 'size', name: 'Size', values: [{ id: 1, value: 'S' }, { id: 2, value: 'M' }] },
  { slug: 'color', name: 'Color', values: [{ id: 10, value: 'Red' }, { id: 11, value: 'Blue' }] },
]

function variant(sku: string, valueIds: number[], inStock = true, imageId: number | null = null): ShopVariant {
  return { sku, price: 100, compareAtPrice: null, valueIds, label: null, imageId, inStock, stockMode: 'tracked', available: inStock ? 5 : 0, minQty: 1, maxQty: null }
}

const product = {
  attributes,
  variants: [variant('S-RED', [1, 10]), variant('M-RED', [2, 10], false), variant('M-BLUE', [2, 11], true, 7)],
}

describe('resolveVariant', () => {
  it('needs every attribute picked and an existing combination', () => {
    expect(resolveVariant(product, { size: 1 })).toBeNull()
    expect(resolveVariant(product, { size: 1, color: 11 })).toBeNull()
    expect(resolveVariant(product, { size: 2, color: 11 })?.sku).toBe('M-BLUE')
  })

  it('returns the only variant of a single product', () => {
    expect(resolveVariant({ attributes: [], variants: [variant('ONE', [])] }, {})?.sku).toBe('ONE')
  })
})

describe('isValueAvailable', () => {
  it('is false for combinations that are missing or out of stock with the other picks', () => {
    expect(isValueAvailable(product, { size: 1, color: 10 }, 'color', 11)).toBe(false)
    expect(isValueAvailable(product, { size: 2, color: 11 }, 'color', 10)).toBe(false)
    expect(isValueAvailable(product, { size: 2, color: 11 }, 'size', 1)).toBe(false)
    expect(isValueAvailable(product, { size: 1, color: 10 }, 'size', 2)).toBe(false)
    expect(isValueAvailable(product, { size: 1, color: 11 }, 'size', 2)).toBe(true)
    expect(isValueAvailable(product, {}, 'color', 11)).toBe(true)
  })
})

describe('isValueSelectable', () => {
  it('disables only values no in-stock variant has', () => {
    expect(isValueSelectable(product, 2)).toBe(true)
    expect(isValueSelectable({ ...product, variants: [variant('S-RED', [1, 10]), variant('M-RED', [2, 10], false)] }, 2)).toBe(false)
  })
})

describe('initialSelection / pickValue', () => {
  it('starts on the first in-stock variant', () => {
    expect(initialSelection(product)).toEqual({ size: 1, color: 10 })
  })

  it('keeps a valid combination', () => {
    expect(pickValue(product, { size: 2, color: 10 }, 'color', 11)).toEqual({ size: 2, color: 11 })
  })

  it('jumps to the closest in-stock variant when the combination is dead', () => {
    expect(pickValue(product, { size: 1, color: 10 }, 'size', 2)).toEqual({ size: 2, color: 11 })
    expect(pickValue(product, { size: 1, color: 10 }, 'color', 11)).toEqual({ size: 2, color: 11 })
  })

  it('leaves the rest open while still choosing', () => {
    expect(pickValue(product, {}, 'size', 2)).toEqual({ size: 2 })
  })
})

describe('variantImageIndex', () => {
  it('finds the variant image in the gallery', () => {
    const images = [{ id: 3, url: 'a', alt: null }, { id: 7, url: 'b', alt: null }]
    expect(variantImageIndex(images, product.variants[2]!)).toBe(1)
    expect(variantImageIndex(images, product.variants[0]!)).toBeNull()
    expect(variantImageIndex(images, null)).toBeNull()
  })
})
