import { canonicalHostRedirect } from '#shared/utils/canonicalHost'

/**
 * One host for search engines: a page asked for on the other spelling of the domain (`profinder.vip` while the site
 * URL is `https://www.profinder.vip`) answers with a 301 to the same path on the site URL. Cloudflare does this at the
 * edge too; this is the safety net for requests that reach the origin without that rule. Runs before
 * `location-redirects.ts` (middleware run in file-name order), so a moved page costs at most one more hop.
 */
export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return

  const to = canonicalHostRedirect(useRuntimeConfig(event).siteUrl, getRequestHeader(event, 'host'), event.path)
  if (to) return sendRedirect(event, to, 301)
})
