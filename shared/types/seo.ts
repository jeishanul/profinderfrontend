export interface BreadcrumbItem {
  label: string
  url: string
}

export interface SeoRobots {
  index: boolean
  follow: boolean
  directive: string
}

export interface SeoOpenGraph {
  title: string
  description: string
  url: string
  site_name: string
  type: string
  /** The admin's share image for this page, else the category's own picture; null when there is none. */
  image?: string | null
}

/** An admin-curated review shown on a landing page. Plain text — render escaped. */
export interface SeoReview {
  reviewer_name: string
  reviewer_role: string | null
  rating: number
  quote_text: string
}

/** An admin-curated question/answer shown below a landing page's footer content. Plain text — render escaped. */
export interface SeoFaq {
  question: string
  answer: string
}

export interface SeoMetadataPayload {
  title: string
  description: string
  keywords: string
  canonical_url: string
  canonical_path: string
  /** True only when an admin set a custom canonical; the page then replaces the site-wide one. */
  canonical_custom: boolean
  robots: SeoRobots
  seo_enabled: boolean
  seo_header_content: string | null
  seo_footer_content: string | null
  seo_reviews: SeoReview[]
  seo_faqs: SeoFaq[]
  breadcrumbs: BreadcrumbItem[]
  og: SeoOpenGraph
}

export interface CategorySeoEntity {
  id: number
  slug: string
  name: string
  icon: string | null
  is_active: boolean
  image_url?: string | null
  image_alt?: string | null
}

export interface RelatedCategoryItem {
  id: number
  name: string
  slug: string
  icon: string | null
  url: string
}

export interface CategorySeoResponse {
  type: 'category'
  entity: CategorySeoEntity
  related_categories?: RelatedCategoryItem[]
  metadata: SeoMetadataPayload
}

export interface LocationHierarchyItem {
  code?: string
  id?: number
  slug: string
  name: string
  url?: string
}

export interface LocationSubItem {
  code?: string
  id?: number
  name: string
  slug: string
  url: string
}

export interface LocationSeoResponse {
  /**
   * Set (and nothing else) when the address moved with a PSA update; `server/middleware/location-redirects.ts`
   * normally answers such an address with a 301 before the page loads.
   */
  redirect?: string
  type: 'province' | 'city' | 'barangay'
  entity: {
    code?: string
    id?: number
    slug: string
    name: string
    prov_code?: string
    mun_code?: string
    province_code?: string
  }
  hierarchy: {
    province: LocationHierarchyItem | null
    city: LocationHierarchyItem | null
    barangay: LocationHierarchyItem | null
  }
  cities?: LocationSubItem[]
  barangays?: LocationSubItem[]
  siblings?: LocationSubItem[]
  province?: LocationHierarchyItem
  city?: LocationHierarchyItem
  metadata: SeoMetadataPayload
}
