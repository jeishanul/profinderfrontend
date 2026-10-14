import type { BuiltInSectionKey, HomeData, HomeSection } from '#shared/types/cms'

/** The landing page as it was before the CMS: the order used when the layout request fails. */
export const DEFAULT_HOME_SECTION_KEYS: BuiltInSectionKey[] = [
  'hero_slides',
  'trust_stats',
  'how_it_works',
  'categories',
  'featured_providers',
  'why_choose_us',
  'jobs_gallery',
  'testimonials',
  'app_download',
  'faq',
]

/** A section with no admin content: every component falls back to its built-in copy. */
export function emptyHomeSection(key: string, type = key): HomeSection {
  return {
    key,
    type,
    anchor: key === 'how_it_works' ? 'how-it-works' : null,
    eyebrow: null,
    heading: null,
    subheading: null,
    body: null,
    imageUrl: null,
    imageAlt: null,
    backgroundImageUrl: null,
    ctaLabel: null,
    ctaUrl: null,
    settings: {},
    items: [],
  }
}

/**
 * The sections to render. A *failed* request (no data) falls back to the default layout so the site still has a
 * landing page; a successful but empty list is the admin's choice (everything hidden) and is respected.
 */
export function resolveHomeSections(data: HomeData | null | undefined): HomeSection[] {
  return data ? data.sections : DEFAULT_HOME_SECTION_KEYS.map(key => emptyHomeSection(key))
}
