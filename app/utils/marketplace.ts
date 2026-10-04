import type { ServiceCategory } from '#shared/types/marketplace'

/** Bounds for the browse page's price-range filter/slider — shared between
 * `ProviderFilterSidebar` (slider + inputs) and `browse.vue` (so it only adds
 * `minPrice`/`maxPrice` to the URL when they've actually been narrowed). */
export const PRICE_MIN = 0
export const PRICE_MAX = 5000
/** Slider granularity — a 5,000-wide range at step 1 is unusable. */
export const PRICE_STEP = 50

/**
 * `ServiceCategory.icon` is a plain string on the wire (shared types can't
 * depend on the app's icon set) and admin-typed, so it can be null or an
 * unrecognised name — this degrades to `fallback` rather than rendering blank.
 */
export function asIconName(icon: string | null | undefined, fallback: IconName = 'briefcase'): IconName {
  return knownIcon(icon, fallback)
}

/** Looks up a category's icon for display alongside a provider card/row. */
export function getCategoryIcon(categories: ServiceCategory[], categoryId: string): IconName {
  return asIconName(categories.find(category => category.id === categoryId)?.icon)
}
