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

export function cleanPath(loc: string): string {
  try {
    if (loc.startsWith('http://') || loc.startsWith('https://')) {
      loc = new URL(loc).pathname
    }
  }
  catch {
    // Keep loc as is if URL parsing fails
  }

  if (!loc.startsWith('/')) {
    loc = `/${loc}`
  }

  if (loc.length > 1 && loc.endsWith('/')) {
    loc = loc.slice(0, -1)
  }

  return loc
}

/**
 * Dynamic sitemap entries:
 * 1. Core public landing pages (/, /browse, /jobs, /blog).
 * 2. Published legal/static pages (/legal/*).
 * 3. Dynamic entities from backend /seo/sitemap-urls:
 *    - Service categories (/category/{slug})
 *    - Location hierarchy (/ph/{province}, /ph/{province}/{city}, etc.)
 *    - Provider profiles using public slugs (/providers/{slug})
 *    - Open job posts using public slugs (/jobs/{slug})
 *    - Published blog posts using public slugs (/blog/{slug})
 */
export default defineSitemapEventHandler(async (event) => {
  // Each source is independent: one failing backend call must not take the whole sitemap down with it.
  const [pages, seo] = await Promise.allSettled([
    callApi<{ slug: string, title: string }[]>(event, '/pages'),
    callApi<{ urls?: SeoSitemapEntry[] } | SeoSitemapEntry[]>(event, '/seo/sitemap-urls'),
  ])

  const urlsMap = new Map<string, SitemapUrlEntry>()

  const addUrl = (entry: SitemapUrlEntry) => {
    const loc = cleanPath(entry.loc)
    const existing = urlsMap.get(loc)
    if (!existing) {
      urlsMap.set(loc, { ...entry, loc })
    }
    else {
      // If duplicate, preserve the higher priority and latest modification
      const priority = Math.max(existing.priority ?? 0.5, entry.priority ?? 0.5) as SitemapPriority
      urlsMap.set(loc, {
        ...existing,
        ...entry,
        loc,
        priority: normalizePriority(priority),
        lastmod: entry.lastmod ?? existing.lastmod,
      })
    }
  }

  // 1. Core indexable landing pages
  addUrl({ loc: '/', changefreq: 'daily', priority: 1 })
  addUrl({ loc: '/browse', changefreq: 'daily', priority: 0.9 })
  addUrl({ loc: '/jobs', changefreq: 'daily', priority: 0.9 })
  addUrl({ loc: '/blog', changefreq: 'weekly', priority: 0.7 })

  // 2. Legal / static pages from /pages
  if (pages.status === 'fulfilled') {
    for (const legalPage of pages.value) {
      addUrl({ loc: `/legal/${legalPage.slug}`, changefreq: 'monthly', priority: 0.3 })
    }
  }
  else {
    console.error('[sitemap] pages source failed', pages.reason)
  }

  // 3. Dynamic entities from backend /seo/sitemap-urls
  if (seo.status === 'fulfilled') {
    const seoEntries = Array.isArray(seo.value) ? seo.value : (seo.value.urls ?? [])
    for (const entry of seoEntries) {
      addUrl({
        loc: entry.loc,
        changefreq: entry.changefreq ?? 'weekly',
        priority: normalizePriority(entry.priority),
        ...(entry.lastmod ? { lastmod: entry.lastmod } : {}),
      })
    }
  }
  else {
    // If the SEO endpoint is temporarily unavailable, carry on with what we have.
    console.error('[sitemap] seo source failed', seo.reason)
  }

  return Array.from(urlsMap.values())
})
