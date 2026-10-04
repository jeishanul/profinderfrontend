import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

interface SitemapUrlEntry {
  loc: string
  changefreq: 'weekly' | 'monthly'
  priority: 0.3 | 0.7
}

/**
 * Dynamic sitemap entries the file-based routes can't produce on their own:
 * every listable provider's profile, and every published legal/static page.
 * Registered via `sitemap.sources` in `nuxt.config.ts`.
 */
export default defineSitemapEventHandler(async (event) => {
  const urls: SitemapUrlEntry[] = []

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

  const pages = await callApi<{ slug: string, title: string }[]>(event, '/pages')
  for (const legalPage of pages) {
    urls.push({ loc: `/legal/${legalPage.slug}`, changefreq: 'monthly', priority: 0.3 })
  }

  return urls
})
