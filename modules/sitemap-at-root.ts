import { defineNuxtModule } from 'nuxt/kit'

/** The part of @nuxtjs/robots' runtime config this module touches (its sitemap lines in robots.txt). */
interface RobotsRuntimeConfig { sitemap?: string[] }

/**
 * Serves the sitemap index at `/sitemap.xml`, the one sitemap address this site publishes.
 *
 * With several sitemap files, @nuxtjs/sitemap serves its index at `/sitemap_index.xml`, answers `/sitemap.xml` with a
 * redirect there, and lists `/sitemap_index.xml` in robots.txt. This runs once every module is set up (`nitro:config`)
 * and swaps that around: the module's index handler moves to `/sitemap.xml` (its redirecting handler is dropped),
 * `/sitemap_index.xml` 301s to `/sitemap.xml`, and robots.txt lists `/sitemap.xml`. The sub-sitemaps the index lists
 * stay at `/__sitemap__/<name>.xml`.
 *
 * If a module upgrade changes these routes the build fails here, instead of quietly publishing another address.
 */
export default defineNuxtModule({
  meta: { name: 'sitemap-at-root' },
  setup(_options, nuxt) {
    nuxt.hook('nitro:config', (nitroConfig) => {
      const handlers = nitroConfig.handlers ?? []
      const indexHandler = handlers.find(handler => handler?.route === '/sitemap_index.xml')
      if (!indexHandler) {
        throw new Error('[sitemap-at-root] @nuxtjs/sitemap no longer registers /sitemap_index.xml: check this module.')
      }
      nitroConfig.handlers = handlers.filter(handler => handler?.route !== '/sitemap.xml')
      indexHandler.route = '/sitemap.xml'

      nitroConfig.routeRules ||= {}
      const { redirect: _redirect, ...indexRules } = nitroConfig.routeRules['/sitemap.xml'] ?? {}
      const { redirect: _oldRedirect, ...oldIndexRules } = nitroConfig.routeRules['/sitemap_index.xml'] ?? {}
      nitroConfig.routeRules['/sitemap.xml'] = { ...oldIndexRules, ...indexRules }
      nitroConfig.routeRules['/sitemap_index.xml'] = { redirect: { to: '/sitemap.xml', statusCode: 301 } }

      const runtimeConfig = nitroConfig.runtimeConfig as Record<string, unknown> & { public?: Record<string, unknown> } | undefined
      for (const robots of [runtimeConfig?.['nuxt-robots'], runtimeConfig?.public?.['nuxt-robots']] as (RobotsRuntimeConfig | undefined)[]) {
        if (robots?.sitemap) {
          robots.sitemap = [...new Set(robots.sitemap.map(path => (path === '/sitemap_index.xml' ? '/sitemap.xml' : path)))]
        }
      }
    })
  },
})
