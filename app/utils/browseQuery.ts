import { PRICE_MAX, PRICE_MIN } from './marketplace'

export const BROWSE_SORTS = ['recommended', 'rating', 'reviews', 'price_asc', 'price_desc', 'newest'] as const
export type BrowseSort = (typeof BROWSE_SORTS)[number]

export interface BrowseFilters {
  q: string
  sort: BrowseSort
  categories: string[]
  skills: string[]
  availableDay: string | null
  province: string | null
  city: string | null
  barangay: string | null
  minRating: number
  verifiedOnly: boolean
  minPrice: number
  maxPrice: number
  page: number
}

const list = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(v => typeof v === 'string' ? v.split(',') : []).filter(Boolean)
  if (typeof value === 'string' && value) return value.split(',').filter(Boolean)
  return []
}
const text = (value: unknown) => (typeof value === 'string' && value ? value : null)

/** The URL is the source of truth for Browse: every filter lives in it, so links, back/forward and reloads all agree. */
export function parseBrowseQuery(query: Record<string, unknown>): BrowseFilters {
  const sort = text(query.sort) as BrowseSort | null
  return {
    q: text(query.q) ?? '',
    sort: sort && BROWSE_SORTS.includes(sort) ? sort : 'recommended',
    // `category` is the older single-value spelling some links still use.
    categories: list(query.categories ?? query.category),
    skills: list(query.skills),
    availableDay: text(query.availableDay),
    province: text(query.province),
    city: text(query.city),
    barangay: text(query.barangay),
    minRating: query.minRating ? Number(query.minRating) : 0,
    verifiedOnly: query.verifiedOnly === 'true',
    minPrice: query.minPrice ? Number(query.minPrice) : PRICE_MIN,
    maxPrice: query.maxPrice ? Number(query.maxPrice) : PRICE_MAX,
    page: query.page ? Math.max(1, Number(query.page)) : 1,
  }
}

/** Filters → the browser URL's query string: only what differs from the defaults. */
export function toBrowseRouteQuery(f: BrowseFilters): Record<string, string> {
  return {
    ...(f.q ? { q: f.q } : {}),
    ...(f.sort !== 'recommended' ? { sort: f.sort } : {}),
    ...(f.categories.length > 0 ? { categories: f.categories.join(',') } : {}),
    ...(f.skills.length > 0 ? { skills: f.skills.join(',') } : {}),
    ...(f.availableDay ? { availableDay: f.availableDay } : {}),
    ...(f.province ? { province: f.province } : {}),
    ...(f.city ? { city: f.city } : {}),
    ...(f.barangay ? { barangay: f.barangay } : {}),
    ...(f.minRating ? { minRating: String(f.minRating) } : {}),
    ...(f.verifiedOnly ? { verifiedOnly: 'true' } : {}),
    ...(f.minPrice > PRICE_MIN ? { minPrice: String(f.minPrice) } : {}),
    ...(f.maxPrice < PRICE_MAX ? { maxPrice: String(f.maxPrice) } : {}),
    ...(f.page > 1 ? { page: String(f.page) } : {}),
  }
}

/** Filters → the `/providers` API query (price becomes the API's `minRate`/`maxRate`). */
export function toProviderApiQuery(f: BrowseFilters, perPage: number) {
  return {
    q: f.q || undefined,
    sort: f.sort !== 'recommended' ? f.sort : undefined,
    categories: f.categories.length > 0 ? f.categories.join(',') : undefined,
    skills: f.skills.length > 0 ? f.skills.join(',') : undefined,
    availableDay: f.availableDay ?? undefined,
    province: f.province ?? undefined,
    city: f.city ?? undefined,
    barangay: f.barangay ?? undefined,
    minRating: f.minRating || undefined,
    verifiedOnly: f.verifiedOnly || undefined,
    minRate: f.minPrice > PRICE_MIN ? f.minPrice : undefined,
    maxRate: f.maxPrice < PRICE_MAX ? f.maxPrice : undefined,
    page: f.page,
    perPage,
  }
}
