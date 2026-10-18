/**
 * SEO 301 redirects and URL canonicalization:
 * 1. Category search query: /browse?category=:slug -> 301 to /category/:slug
 * 2. Location URLs without /ph/ prefix: /:province/:city/:barangay -> 301 to /ph/:province/:city/:barangay
 */
export default defineNuxtRouteMiddleware((to) => {
  const path = to.path.replace(/\/+$/, '') || '/'

  // 1. /browse?category=:slug or /browse?categories=:slug -> 301 redirect to /category/:slug
  if (path === '/browse' || path.endsWith('/browse')) {
    const rawCategory = to.query.category || to.query.categories
    if (rawCategory && typeof rawCategory === 'string') {
      const slug = rawCategory.split(',')[0]?.trim()
      if (slug) {
        const { category: _c, categories: _cs, ...remainingQuery } = to.query
        return navigateTo({
          path: `/category/${encodeURIComponent(slug)}`,
          query: remainingQuery,
        }, { redirectCode: 301, external: false })
      }
    }
  }

  // 2. Location URLs without /ph/ prefix (2 or 3 segments)
  const segments = path.split('/').filter(Boolean)
  const KNOWN_ROOTS = new Set([
    'api',
    'admin',
    'ph',
    'category',
    'browse',
    'jobs',
    'services',
    'become-a-provider',
    'dashboard',
    'seek-job',
    'find-jobs',
    'profile',
    'messages',
    'notifications',
    'settings',
    'purchases',
    'clients',
    'saved-providers',
    'legal',
    'blog',
    '_nuxt',
    '_loading',
  ])

  if (segments.length >= 2 && segments.length <= 3 && !KNOWN_ROOTS.has(segments[0]!)) {
    return navigateTo({
      path: `/ph/${segments.join('/')}`,
      query: to.query,
    }, { redirectCode: 301, external: false })
  }
})
