import type { H3Event } from 'h3'

/**
 * Lets the browser reuse a public answer (the same for every visitor) for `maxAge` seconds, and serve it stale while
 * revalidating for `staleWhileRevalidate` more, so client-side navigation doesn't refetch it. Call it only once the
 * answer is in hand: an error thrown before it must never be cached by the browser (a `routeRules` header would be,
 * since it is set on every response, failures included). Never for anything that depends on the viewer.
 */
export function setBrowserCache(event: H3Event, maxAge: number, staleWhileRevalidate = maxAge * 5): void {
  setResponseHeader(event, 'Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`)
}

/** Seconds a browser may reuse a public list (categories, FAQ, ...): as long as Nitro's own cache of it. */
export const PUBLIC_LIST_BROWSER_SECONDS = 60

/** Location reference data changes only with a bulk import (`locations:sync`). */
export const LOCATIONS_BROWSER_SECONDS = 300
