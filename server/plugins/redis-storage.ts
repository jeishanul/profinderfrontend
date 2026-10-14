import type { Storage } from 'unstorage'
import redisDriver from 'unstorage/drivers/redis'

/**
 * Storage mounts moved to Redis when `NUXT_REDIS_URL` is set. Production runs several Node processes
 * (PM2 cluster, `deploy/pm2/ecosystem.config.cjs`), so anything kept in process memory would be per process:
 * - `#rate-limiter-storage`: nuxt-security's limiter. In memory, each process keeps its own count, so a visitor
 *   gets the budget once per process. The limiter never sets an expiry itself, so the mount does: one interval
 *   (5 min, `security.rateLimiter` in `nuxt.config.ts`) plus margin.
 * - `cache`: Nitro's cache (`defineCachedEventHandler` / `defineCachedFunction`), shared so it warms once. With `swr`
 *   Nitro writes entries without an expiry, and `server/utils/publicApi.ts` keys one per distinct query, so the
 *   mount expires anything not refreshed within an hour (keys would otherwise accumulate in Redis for good).
 */
export const REDIS_MOUNTS = [
  { mount: '#rate-limiter-storage', base: 'profinder:rate-limit', ttl: 600 },
  { mount: 'cache', base: 'profinder:nitro-cache', ttl: 3600 },
] as const

/** Without a URL (local dev, single instance) the in-memory defaults stay. */
export async function mountRedisStorage(storage: Storage, redisUrl: string): Promise<void> {
  if (!redisUrl) return

  for (const { mount, base, ...options } of REDIS_MOUNTS) {
    await storage.unmount(mount, false)
    storage.mount(mount, redisDriver({ url: redisUrl, base, ...options }))
  }
}

/**
 * Nitro does not await plugins, but `unmount` without dispose does no I/O, so the swap completes in microtasks,
 * before the server takes its first request.
 */
export default defineNitroPlugin(() => mountRedisStorage(useStorage(), useRuntimeConfig().redisUrl))
