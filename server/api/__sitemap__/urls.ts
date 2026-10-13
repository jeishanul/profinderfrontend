import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

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
 */
export default defineSitemapEventHandler(async (event) => {
  const urls: SitemapUrlEntry[] = []

  // Each source is independent: one failing backend call must not take the whole sitemap down with it.
  // 1. Providers
  try {
    const PER_PAGE = 50
    let page = 1
    let hasMore = true
    while (hasMore) {
      const result = await callApi<PagedResult<ProviderSummary>>(event, '/providers', {
        query: { page, perPage: PER_PAGE, sort: 'rating' },
      })
      for (const provider of result.items) {
        urls.push({ loc: `/providers/${provider.id}`, changefreq: 'weekly', priority: 0.7 })
      }
      hasMore = page < result.totalPages
      page += 1
    }
  }
  catch (error) {
    console.error('[sitemap] providers source failed', error)
  }

  // 2. Legal / static pages
  try {
    const pages = await callApi<{ slug: string, title: string }[]>(event, '/pages')
    for (const legalPage of pages) {
      urls.push({ loc: `/legal/${legalPage.slug}`, changefreq: 'monthly', priority: 0.3 })
    }
  }
  catch (error) {
    console.error('[sitemap] pages source failed', error)
  }

  // 3. Dynamic category and location SEO landing pages
  try {
    const res = await callApi<{ urls?: SeoSitemapEntry[] } | SeoSitemapEntry[]>(event, '/seo/sitemap-urls')
    const seoEntries = Array.isArray(res) ? res : (res.urls ?? [])
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
  catch (error) {
    // If the SEO endpoint is temporarily unavailable, carry on with the providers and legal pages.
    console.error('[sitemap] seo source failed', error)
  }

  return urls
})
