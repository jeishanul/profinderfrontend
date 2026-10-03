/**
 * Display copy for all of these lives in i18n messages, keyed by the ids here
 * (e.g. `marketplace.categories.${category.id}.label`) — see Internationalization
 * in CLAUDE.md. Only genuine proper nouns (`name`, `reviewerName`) are plain strings.
 */

export interface ServiceCategory {
  id: string
  /** Admin-editable in the backend CMS — used directly now instead of an
   * i18n lookup, since admins can add categories with no matching i18n key. */
  name: string
  icon: string | null
  providerCount: number
  /** Only present when requested with `?include=skills`. */
  skills?: { id: string, name: string }[]
}

/** The public slice of the admin's Settings page — see `GET /settings`. */
export interface SiteSettings {
  siteName: string | null
  siteTagline: string | null
  logoUrl: string | null
  logoDarkUrl: string | null
  faviconUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  supportHours: string | null
  social: { facebook: string | null, x: string | null, instagram: string | null }
  defaultLocale: string
  defaultCurrency: string
  seoDefaultTitle: string | null
  seoDefaultDescription: string | null
  appStoreUrl: string | null
  playStoreUrl: string | null
  maintenanceMode: boolean
}

export interface StaticPageContent {
  slug: string
  title: string
  /** Sanitised HTML — safe to render with `v-html`. */
  content: string
  metaTitle: string | null
  metaDescription: string | null
  updatedAt: string | null
}

export interface Review {
  id: string
  reviewerName: string
  rating: number
  comment: string | null
  /** ISO instant. */
  postedAt: string
  reviewerAvatarUrl: string | null
  providerReply: string | null
  /** True only for the reviewed provider, viewing their own list, when they haven't replied yet. */
  canReply: boolean
}

export interface ProviderSummary {
  id: string
  name: string
  headline: string | null
  avatarUrl: string | null
  coverPhotoUrl: string | null
  /** Display names from the API — admin-created categories/skills have no i18n entry. */
  categoryName: string
  skills: { id: string, name: string }[]
  categoryId: string
  rating: number
  reviewCount: number
  ratePerHour: number
  yearsExperience: number
  verified: boolean
  /** Philippines Province -> City/Municipality -> Barangay — see
   * `server/utils/phLocations.ts`. `provinceCode`/`cityCode` are the real
   * PSGC-derived codes (used for filtering); the `*Name` fields and
   * `barangay` are display-ready strings. */
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  barangay: string
}

export interface ProviderProfile extends ProviderSummary {
  bio: string | null
  jobsCompleted: number
  repeatClientPercent: number
  responseTimeHours: number
  /** Null when the provider hasn't set one. */
  minVisitFee: number | null
  /** The provider's user id, to recognise your own profile. */
  userId: string
  /** Null when the provider hasn't set a service radius. */
  serviceAreaKm: number | null
  /** Day ids (`'mon'`..`'sun'`) — see `formatAvailabilityDays` in `app/utils/availability.ts`. */
  availableDays: string[]
  /** ISO date the provider joined. */
  memberSince: string
  workPhotos: { id: string, url: string }[]
  /** Active listings only. */
  services: { id: string, title: string, description: string | null, priceType: 'flat' | 'hourly', priceAmount: number, durationLabel: string | null }[]
  /** The newest few; page the rest through `/providers/:id/reviews`. */
  reviews: Review[]
  /** Published reviews per star, highest first. */
  ratingBreakdown: { stars: number, count: number }[]
  reviewsTotal: number
}

export interface Testimonial {
  id: string
  reviewerName: string
  /** Optional — e.g. "Homeowner, Makati". Admin-editable, real content. */
  reviewerRole: string | null
  rating: number
  /** Admin-editable in the backend CMS — used directly instead of an
   * i18n lookup, since admins can add testimonials with no matching key. */
  quoteText: string
  avatarUrl: string | null
}

export interface FaqItem {
  id: string
  /** Admin-editable in the backend CMS — used directly instead of an
   * i18n lookup, since admins can add FAQs with no matching key. */
  question: string
  answer: string
}

export type GalleryTab = 'home' | 'recommended' | 'trending'

export interface GalleryItem {
  categoryId: string
  categoryName: string
  title: string | null
  imageUrl: string | null
}

/**
 * A single admin-managed item within a homepage content section (hero
 * slides, trust stats, how-it-works steps, why-choose-us points, app-download
 * badges). The section-level heading/eyebrow copy stays in i18n — only the
 * repeatable items themselves come from the API. See `/api/content/[section]`.
 */
export interface ContentItem {
  title: string | null
  subtitle: string | null
  description: string | null
  icon: string | null
  value: string | null
  imageUrl: string | null
  linkUrl: string | null
}

export type ContentSectionKey = 'hero_badge' | 'hero_slides' | 'trust_stats' | 'how_it_works' | 'why_choose_us' | 'app_download'

export interface PagedResult<T> {
  items: T[]
  page: number
  perPage: number
  total: number
  totalPages: number
}
