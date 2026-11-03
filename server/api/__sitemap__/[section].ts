/**
 * The source of one sub-sitemap, `/__sitemap__/<section>.xml`, listed in the index at `/sitemap.xml`
 * (see `sitemap.sitemaps` in nuxt.config.ts). `pages` also carries the fixed pages (home, browse, jobs, shop, blog).
 */
export default defineSitemapEventHandler((event) => {
  const section = getRouterParam(event, 'section')
  if (!isSitemapSection(section)) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown sitemap section' })
  }

  return collectSitemapUrls(
    name => fetchSitemapSection(event, name),
    [section],
    section === 'pages' ? CORE_SITEMAP_PAGES : [],
    section,
  )
})
