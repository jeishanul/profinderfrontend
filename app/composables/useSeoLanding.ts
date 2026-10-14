import type { SeoMetadataPayload } from '#shared/types/seo'

/**
 * The head, schema and OG wiring every SEO landing page (category, province, city, barangay) shares.
 * Pages using it are keyed by path (`definePageMeta({ key: route => route.path })`), so moving between two
 * landing pages builds a fresh component and every value below is read from the new page's data.
 * Canonical, hreflang and og:locale are emitted once, in `app.vue`; a page only overrides the canonical when
 * an admin set a custom one.
 */
export function useSeoLanding(meta: Ref<SeoMetadataPayload>, eyebrow: string) {
  const siteUrl = (useSiteConfig().url ?? '').replace(/\/$/, '')

  useSeoMeta({
    title: () => meta.value.title,
    description: () => meta.value.description,
    robots: () => meta.value.robots.directive,
    ogTitle: () => meta.value.og.title,
    ogDescription: () => meta.value.og.description,
    ogUrl: () => meta.value.og.url,
    ogSiteName: () => meta.value.og.site_name,
    ogType: 'website',
  })

  useHead({
    meta: meta.value.keywords ? [{ name: 'keywords', content: meta.value.keywords }] : [],
  })

  useSetCanonicalOverride(meta.value.canonical_custom ? meta.value.canonical_url : null)

  useSchemaOrg([
    defineWebPage({
      name: meta.value.title,
      description: meta.value.description,
    }),
    defineBreadcrumb({
      itemListElement: (meta.value.breadcrumbs || []).map(crumb => ({
        name: crumb.label,
        item: crumb.url.startsWith('http') ? crumb.url : `${siteUrl}${crumb.url}`,
      })),
    }),
  ])

  useShareImage(meta.value.og.image, 'MarketplaceSatori', {
    title: meta.value.title,
    eyebrow,
  })
}
