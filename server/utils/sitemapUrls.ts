/**
 * Builds the sitemap's URL lists from Laravel's `/seo/sitemap-urls?type=<section>`. `/sitemap.xml` is a sitemap index
 * with one sub-sitemap per section (see `sitemap.sitemaps` in nuxt.config.ts and `modules/sitemap-at-root.ts`): the
 * standard split by content type, and each file stays under the 50k-URL limit (barangays, the largest, ~42k).
 */

export type SitemapPriority = 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1
export type SitemapChangefreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface SitemapUrlEntry {
  loc: string
  changefreq?: SitemapChangefreq
  priority?: SitemapPriority
  lastmod?: string
  /** The sub-sitemap the URL belongs to, so the module never files it under another one (e.g. a locale's). */
  _sitemap?: string
}

/** One entry as Laravel sends it: an absolute URL and a free-form priority. */
export interface SeoSitemapEntry {
  loc: string
  lastmod?: string | null
  changefreq?: SitemapChangefreq
  priority?: number
}

/**
 * The sections Laravel's sitemap feed knows (`SeoController::SITEMAP_SECTIONS`), one sub-sitemap each, in the
 * order the index lists them.
 */
export const SITEMAP_SECTIONS = ['pages', 'categories', 'provinces', 'cities', 'barangays', 'providers', 'jobs', 'blog', 'shop'] as const
export type SitemapSection = typeof SITEMAP_SECTIONS[number]

export function isSitemapSection(value: unknown): value is SitemapSection {
  return typeof value === 'string' && (SITEMAP_SECTIONS as readonly string[]).includes(value)
}

/** Fixed public pages with no database row behind them. */
export const CORE_SITEMAP_PAGES: SitemapUrlEntry[] = [
  { loc: '/', changefreq: 'daily', priority: 1 },
  { loc: '/browse', changefreq: 'daily', priority: 0.9 },
  { loc: '/jobs', changefreq: 'daily', priority: 0.9 },
  { loc: '/shop', changefreq: 'daily', priority: 0.8 },
  { loc: '/blog', changefreq: 'weekly', priority: 0.7 },
]

/**
 * Building a section can read every barangay on a cold cache. Crawlers wait for a sitemap, unlike a visitor waiting
 * for a page, so this is far longer than a page's 5 s read timeout: a timeout would drop the whole section.
 */
export const SITEMAP_SECTION_TIMEOUT_MS = 30000

export function normalizePriority(val?: number | null): SitemapPriority {
  if (val === undefined || val === null) return 0.7
  const allowed: SitemapPriority[] = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
  let closest = allowed[0]!
  for (const candidate of allowed) {
    if (Math.abs(val - candidate) < Math.abs(val - closest)) closest = candidate
  }
  return closest
}

/** A site path: the backend's absolute URL loses its origin (the module adds this site's own), no trailing slash. */
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
 * The URLs for one sitemap file: the given fixed pages, then each section's entries, de-duplicated by path.
 * Sections are fetched in parallel and independently, so one failing section never empties the others.
 */
export async function collectSitemapUrls(
  fetchSection: (section: SitemapSection) => Promise<SeoSitemapEntry[] | { urls?: SeoSitemapEntry[] }>,
  sections: SitemapSection[],
  fixedPages: SitemapUrlEntry[] = [],
  sitemapName?: string,
): Promise<SitemapUrlEntry[]> {
  const urls = new Map<string, SitemapUrlEntry>()

  const add = (input: SitemapUrlEntry) => {
    const entry = sitemapName ? { ...input, _sitemap: sitemapName } : input
    const loc = cleanPath(entry.loc)
    const existing = urls.get(loc)
    if (!existing) {
      urls.set(loc, { ...entry, loc })
      return
    }
    // Keep the higher priority and the latest modification.
    urls.set(loc, {
      ...existing,
      ...entry,
      loc,
      priority: normalizePriority(Math.max(existing.priority ?? 0.5, entry.priority ?? 0.5)),
      lastmod: entry.lastmod ?? existing.lastmod,
    })
  }

  fixedPages.forEach(add)

  const results = await Promise.allSettled(sections.map(section => fetchSection(section)))
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[sitemap] section "${sections[index]}" failed`, result.reason)
      return
    }
    const entries = Array.isArray(result.value) ? result.value : (result.value.urls ?? [])
    for (const entry of entries) {
      add({
        loc: entry.loc,
        changefreq: entry.changefreq ?? 'weekly',
        priority: normalizePriority(entry.priority),
        ...(entry.lastmod ? { lastmod: entry.lastmod } : {}),
      })
    }
  })

  return Array.from(urls.values())
}

/** One section of Laravel's sitemap feed (cached there for an hour). */
export function fetchSitemapSection(event: Parameters<typeof callApi>[0], section: SitemapSection) {
  return callApi<{ urls?: SeoSitemapEntry[] }>(event, '/seo/sitemap-urls', {
    query: { type: section },
    timeout: SITEMAP_SECTION_TIMEOUT_MS,
  })
}
