/**
 * SEO 301 redirects and URL canonicalization:
 * 1. Category search query: /browse?category=:slug -> 301 to /category/:slug (and ?skills=:skill -> /category/:slug/:skill)
 * 2. Location URLs without /ph/ prefix: /:province/:city/:barangay -> 301 to /ph/:province/:city/:barangay
 * 3. An app page wrongly sent under /ph/ by rule 2 before its root was listed (/ph/billing/invoices/INV-1 -> 301 to
 *    /billing/invoices/INV-1). Browsers keep a 301, so this undoes the ones they already cached.
 */
export default defineNuxtRouteMiddleware((to) => {
  const path = to.path.replace(/\/+$/, '') || '/'

  // 1. /browse?category=:slug or /browse?categories=:slug -> 301 redirect to /category/:slug
  if (path === '/browse' || path.endsWith('/browse')) {
    const rawCategory = to.query.category || to.query.categories
    if (rawCategory && typeof rawCategory === 'string') {
      const slug = rawCategory.split(',')[0]?.trim()
      if (slug) {
        // A single sub-category goes to its own page (/category/:slug/:skill); several stay a filter on the category page.
        const skills = typeof to.query.skills === 'string' ? to.query.skills.split(',').map(s => s.trim()).filter(Boolean) : []
        const skill = skills.length === 1 ? skills[0]! : null
        const { category: _c, categories: _cs, ...rest } = to.query
        const { skills: _s, ...withoutSkills } = rest
        return navigateTo({
          path: `/category/${encodeURIComponent(slug)}${skill ? `/${encodeURIComponent(skill)}` : ''}`,
          query: skill ? withoutSkills : rest,
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
    'providers',
    'shop',
    'billing',
    'subscription',
    '_nuxt',
    '_loading',
  ])

  // 3. /ph/<app page>/... -> the app page. No province is named after an app page.
  if (segments[0] === 'ph' && segments.length >= 2 && KNOWN_ROOTS.has(segments[1]!) && segments[1] !== 'ph') {
    return navigateTo({
      path: `/${segments.slice(1).join('/')}`,
      query: to.query,
    }, { redirectCode: 301, external: false })
  }

  if (segments.length >= 2 && segments.length <= 3 && !KNOWN_ROOTS.has(segments[0]!)) {
    return navigateTo({
      path: `/ph/${segments.join('/')}`,
      query: to.query,
    }, { redirectCode: 301, external: false })
  }
})
