import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * How long a public answer from Laravel is served from Nitro's cache before it is refreshed. After that the stale
 * copy is still served while one request refreshes it in the background (`swr`), so a visitor never waits on an
 * expiry. Kept short on purpose: an admin's edit shows within about a minute, with no purge step to forget.
 */
export const PUBLIC_API_CACHE_SECONDS = 60

type Query = Record<string, unknown>

/**
 * Cache key for a path and query. Hashed: Nitro strips every non-word character from keys, which would make
 * `?a=1&b=2` and `?a=12&b=` collide. Undefined and empty values are dropped and the rest sorted, so the same
 * request always lands on the same entry however its query was built.
 */
export function publicApiCacheKey(path: string, query: Query = {}): string {
  const normalized = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
  return createHash('sha256').update(JSON.stringify([path, normalized])).digest('hex')
}

/**
 * Cache lifetimes a caller can pick (`ttl` below), in seconds. `default` is right for nearly everything.
 * - `short`: data an admin expects to see change at once (site settings: branding, maintenance mode). Still saves
 *   Laravel a request on every render, the way the old uncached call didn't.
 * - `long`: lookups that only change with a bulk job (the old-address redirect table, `locations:sync`).
 */
export const PUBLIC_API_TTL_SECONDS = { short: 10, default: PUBLIC_API_CACHE_SECONDS, long: 3600 } as const

export type PublicApiTtl = keyof typeof PUBLIC_API_TTL_SECONDS

/**
 * The cached call, one per lifetime (Nitro fixes `maxAge` when the function is defined). It runs with the real event
 * of whichever visitor's request missed, so that one Laravel call is still attributed (and rate limited) to that
 * visitor. `defineCachedEventHandler` would instead hand the handler a stripped copy of the request without the
 * visitor's address. Always without the caller's token: a cached answer is shared by everyone, so it must never
 * depend on who asked.
 */
function defineCachedGet(ttl: PublicApiTtl) {
  return defineCachedFunction(
    (event: H3Event, path: string, query: Query) => callApi(event, path, { query, auth: false }),
    {
      // The default keeps its original name, so entries already in Redis stay valid across the deploy.
      name: ttl === 'default' ? 'public-api' : `public-api-${ttl}`,
      maxAge: PUBLIC_API_TTL_SECONDS[ttl],
      swr: true,
      getKey: (_event: H3Event, path: string, query: Query) => publicApiCacheKey(path, query),
      // Kill switch (NUXT_API_CACHE=false): every call goes straight to Laravel again.
      shouldBypassCache: () => !useRuntimeConfig().apiCache,
    },
  )
}

const cachedGets: Record<PublicApiTtl, ReturnType<typeof defineCachedGet>> = {
  short: defineCachedGet('short'),
  default: defineCachedGet('default'),
  long: defineCachedGet('long'),
}

/**
 * A GET from Laravel for data that is the same for every visitor, served from Nitro's shared cache (Redis in
 * production, see `server/plugins/redis-storage.ts`). Errors are not cached: a 404 or a timeout is retried on the
 * next request.
 *
 * `viewerDependent` is for endpoints whose answer changes for a signed-in viewer (a provider's own page shows them
 * things others don't). Only visitors without a session are served from the cache; anyone signed in goes straight
 * to Laravel with their token, as before.
 *
 * `ttl` picks the cache lifetime (see `PUBLIC_API_TTL_SECONDS`).
 */
export function getPublicApi<T>(event: H3Event, path: string, query: Query = {}, options: { viewerDependent?: boolean, ttl?: PublicApiTtl } = {}): Promise<T> {
  if (options.viewerDependent && getAuthToken(event)) return callApi<T>(event, path, { query })
  return cachedGets[options.ttl ?? 'default'](event, path, query) as Promise<T>
}
