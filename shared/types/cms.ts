/**
 * What the admin CMS sends for the landing page (`/api/home` -> Laravel `/v1/home`). Every text field can be null: a
 * null (or empty) field means "use the built-in i18n copy", so the page is never blank. See `app/utils/cms.ts`.
 */

/** Options stored on a section (per block type). Values arrive already merged with the backend's defaults. */
export type CmsOptions = Record<string, string | number | undefined>

/** A repeatable entry inside a section (a slide, a step, a stat, a logo...). */
export interface HomeSectionItem {
  title: string | null
  subtitle: string | null
  description: string | null
  icon: string | null
  /** Trust-stat figure; the backend has already replaced `{{tokens}}` with live numbers. */
  value: string | null
  imageUrl: string | null
  imageAlt: string | null
  secondaryImageUrl: string | null
  linkUrl: string | null
  ctaLabel: string | null
  /** Hero slides: layout, tone, overlay, align, focalX/focalY, secondaryCtaLabel/Url. Empty for other types. */
  meta: CmsOptions
}

export interface HomeSection {
  key: string
  /** The built-in key (`hero_slides`, ...) or a custom block type (`image_text`, ...). */
  type: string
  /** Element id, so a menu link to `/#anchor` lands here. */
  anchor: string | null
  eyebrow: string | null
  heading: string | null
  subheading: string | null
  /** Sanitized HTML. */
  body: string | null
  imageUrl: string | null
  imageAlt: string | null
  backgroundImageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  settings: CmsOptions
  /** Empty for sections whose entries come from their own endpoint (categories, providers, gallery, testimonials, FAQ). */
  items: HomeSectionItem[]
}

export interface HomeData {
  heroBadge: string | null
  sections: HomeSection[]
}

/** The landing sections the page knows how to render itself; any other `type` is a custom block (`CmsBlock`). */
export type BuiltInSectionKey
  = | 'hero_slides'
    | 'trust_stats'
    | 'how_it_works'
    | 'categories'
    | 'featured_providers'
    | 'why_choose_us'
    | 'jobs_gallery'
    | 'testimonials'
    | 'app_download'
    | 'faq'
