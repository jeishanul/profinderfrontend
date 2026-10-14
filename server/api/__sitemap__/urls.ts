type SitemapPriority = 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1

interface SitemapUrlEntry {
  loc: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: SitemapPriority
  lastmod?: string
}

function normalizePriority(val?: number): SitemapPriority {
  if (val === undefined || val === null) return 0.7
  const allowed: SitemapPriority[] = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
  let closest = allowed[0]!
  let minDiff = Math.abs(val - closest)
  for (const candidate of allowed) {
    const diff = Math.abs(val - candidate)
    if (diff < minDiff) {
      minDiff = diff
      closest = candidate
    }
  }
  return closest
}

interface SeoSitemapEntry {
  loc: string
  lastmod?: string | null
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

/**
 * Dynamic sitemap entries the file-based routes can't produce on their own:
 * every listable provider's profile, published legal/static pages, and
 * SEO category and location hierarchy landing pages (/category/* and /ph/*).
 * Registered via `sitemap.sources` in `nuxt.config.ts`.
 *
 * Two backend calls, made together. Provider pages come with the SEO entries from `/seo/sitemap-urls` (one query on
 * the backend, cached there); they used to be collected by paging through `/providers` 50 at a time, one request
 * after another.
 */
export default defineSitemapEventHandler(async (event) => {
  // Each source is independent: one failing backend call must not take the whole sitemap down with it.
  const [pages, seo] = await Promise.allSettled([
    callApi<{ slug: string, title: string }[]>(event, '/pages'),
    callApi<{ urls?: SeoSitemapEntry[] } | SeoSitemapEntry[]>(event, '/seo/sitemap-urls'),
  ])

  const urls: SitemapUrlEntry[] = []

  // 1. Legal / static pages
  if (pages.status === 'fulfilled') {
    for (const legalPage of pages.value) {
      urls.push({ loc: `/legal/${legalPage.slug}`, changefreq: 'monthly', priority: 0.3 })
    }
  }
  else {
    console.error('[sitemap] pages source failed', pages.reason)
  }

  // 2. Provider profiles, and the category and location SEO landing pages
  if (seo.status === 'fulfilled') {
    const seoEntries = Array.isArray(seo.value) ? seo.value : (seo.value.urls ?? [])
    for (const entry of seoEntries) {
      let loc = entry.loc
      try {
        if (loc.startsWith('http://') || loc.startsWith('https://')) {
          loc = new URL(loc).pathname
        }
      }
      catch {
        // Keep loc as is if URL parsing fails
      }
      urls.push({
        loc,
        changefreq: entry.changefreq ?? 'weekly',
        priority: normalizePriority(entry.priority),
        ...(entry.lastmod ? { lastmod: entry.lastmod } : {}),
      })
    }
  }
  else {
    // If the SEO endpoint is temporarily unavailable, carry on with the legal pages.
    console.error('[sitemap] seo source failed', seo.reason)
  }

  return urls
})
