/**
 * The address to permanently redirect a request to when it reached the site under the other spelling of its domain
 * (`profinder.vip` when the site lives on `www.profinder.vip`, or the reverse), or null when it needs no redirect.
 * Search engines then only ever see one host. Any other host (localhost, 127.0.0.1, a health check) is left alone, so
 * a misconfigured site URL can never redirect internal traffic.
 */
export function canonicalHostRedirect(siteUrl: string, requestHost: string | undefined, requestPath: string): string | null {
  if (!requestHost) return null

  let site: URL
  try {
    site = new URL(siteUrl)
  }
  catch {
    return null
  }

  const canonical = site.hostname.toLowerCase()
  const host = requestHost.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '')
  if (host === canonical) return null

  const isAlias = canonical.startsWith('www.')
    ? host === canonical.slice(4)
    : host === `www.${canonical}`
  if (!isAlias) return null

  const path = requestPath.startsWith('/') ? requestPath : `/${requestPath}`
  return `${site.origin}${path}`
}
