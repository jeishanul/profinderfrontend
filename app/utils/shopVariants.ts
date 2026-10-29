import type { ShopAttribute, ShopProductImage, ShopVariant } from '#shared/types/shop'

/** The value picked per attribute (`attribute.slug` → value id). Unpicked attributes are absent. */
export type VariantSelection = Record<string, number>

interface VariantSource {
  attributes: ShopAttribute[]
  variants: ShopVariant[]
}

function attributeOf(product: VariantSource, valueId: number): ShopAttribute | undefined {
  return product.attributes.find(attribute => attribute.values.some(value => value.id === valueId))
}

/** The variant's value per attribute. */
export function selectionOf(product: VariantSource, variant: ShopVariant): VariantSelection {
  const selection: VariantSelection = {}
  for (const valueId of variant.valueIds) {
    const attribute = attributeOf(product, valueId)
    if (attribute) selection[attribute.slug] = valueId
  }
  return selection
}

/** Whether a variant agrees with every picked value (unpicked attributes match anything). */
function matches(product: VariantSource, variant: ShopVariant, selection: VariantSelection): boolean {
  return product.attributes.every((attribute) => {
    const picked = selection[attribute.slug]
    return picked === undefined || variant.valueIds.includes(picked)
  })
}

/**
 * The variant for a complete selection, or `null` while an attribute is still unpicked or the combination doesn't
 * exist. A product without attributes (`single`) is its one variant.
 */
export function resolveVariant(product: VariantSource, selection: VariantSelection): ShopVariant | null {
  if (product.attributes.length === 0) return product.variants[0] ?? null
  if (product.attributes.some(attribute => selection[attribute.slug] === undefined)) return null
  return product.variants.find(variant => matches(product, variant, selection)) ?? null
}

/**
 * Whether picking `valueId` for `attributeSlug`, keeping the other picks, leads to a variant that exists and is in
 * stock. Such a value is shown as available; any other is shown crossed out.
 */
export function isValueAvailable(product: VariantSource, selection: VariantSelection, attributeSlug: string, valueId: number): boolean {
  const next = { ...selection, [attributeSlug]: valueId }
  return product.variants.some(variant => variant.inStock && matches(product, variant, next))
}

/**
 * Whether a value can be picked at all: some variant in stock has it. Picking a value that doesn't fit the other
 * picks jumps to the nearest variant that has it (`pickValue`), so the shopper is never stuck behind a crossed-out
 * combination. A value no in-stock variant has is disabled.
 */
export function isValueSelectable(product: VariantSource, valueId: number): boolean {
  return product.variants.some(variant => variant.inStock && variant.valueIds.includes(valueId))
}

/** Where the picker starts: the first variant in stock (else the first one), fully selected. */
export function initialSelection(product: VariantSource): VariantSelection {
  const variant = product.variants.find(candidate => candidate.inStock) ?? product.variants[0]
  return variant ? selectionOf(product, variant) : {}
}

/**
 * Picks a value. When the other picks no longer fit with it, jumps to the closest variant that has the new value
 * (in stock first, then the one sharing the most current picks), so the picker never lands on a dead combination.
 */
export function pickValue(product: VariantSource, selection: VariantSelection, attributeSlug: string, valueId: number): VariantSelection {
  const next = { ...selection, [attributeSlug]: valueId }
  const exact = resolveVariant(product, next)
  if (exact?.inStock) return next
  // Still choosing (an attribute left unpicked) and the picks so far fit something: leave the rest to the visitor.
  const complete = product.attributes.every(attribute => next[attribute.slug] !== undefined)
  if (!complete && product.variants.some(variant => matches(product, variant, next))) return next

  const candidates = product.variants.filter(variant => variant.valueIds.includes(valueId))
  if (candidates.length === 0) return next

  const shared = (variant: ShopVariant) => Object.values(next).filter(id => variant.valueIds.includes(id)).length
  const best = [...candidates].sort((a, b) => Number(b.inStock) - Number(a.inStock) || shared(b) - shared(a))[0]!
  return selectionOf(product, best)
}

/** The picture to show for a variant: its own image when it has one, else `null` (keep the gallery as is). */
export function variantImageIndex(images: ShopProductImage[], variant: ShopVariant | null): number | null {
  if (!variant || variant.imageId === null) return null
  const index = images.findIndex(image => image.id === variant.imageId)
  return index === -1 ? null : index
}
