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
  breadcrumbs: BreadcrumbItem[]
  og: SeoOpenGraph
}

export interface CategorySeoEntity {
  id: number
  slug: string
  name: string
  icon: string | null
  is_active: boolean
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
