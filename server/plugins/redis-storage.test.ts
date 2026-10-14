// @vitest-environment node
import { createStorage } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'
import { beforeAll, describe, expect, it, vi } from 'vitest'

let mountRedisStorage: (storage: ReturnType<typeof createStorage>, redisUrl: string) => Promise<void>

beforeAll(async () => {
  vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
  ;({ mountRedisStorage } = await import('./redis-storage'))
  vi.unstubAllGlobals()
})

async function storageAfterPlugin(redisUrl: string) {
  const storage = createStorage()
  storage.mount('#rate-limiter-storage', memoryDriver())
  storage.mount('cache', memoryDriver())
  await mountRedisStorage(storage, redisUrl)
  return storage
}

describe('mountRedisStorage', () => {
  it('moves the rate limiter and the Nitro cache to Redis when NUXT_REDIS_URL is set', async () => {
    const storage = await storageAfterPlugin('redis://127.0.0.1:6379/2')

    expect(storage.getMount('#rate-limiter-storage:x').driver.name).toBe('redis')
    expect(storage.getMount('cache:x').driver.name).toBe('redis')
  })

  it('gives rate-limit counters and cache entries an expiry, since neither writer sets one itself', async () => {
    const storage = await storageAfterPlugin('redis://127.0.0.1:6379/2')

    expect(storage.getMount('#rate-limiter-storage:x').driver.options).toMatchObject({ ttl: 600 })
    expect(storage.getMount('cache:x').driver.options).toMatchObject({ ttl: 3600 })
  })

  it('keeps the in-memory stores without NUXT_REDIS_URL', async () => {
    const storage = await storageAfterPlugin('')

    expect(storage.getMount('#rate-limiter-storage:x').driver.name).toBe('memory')
    expect(storage.getMount('cache:x').driver.name).toBe('memory')
  })
})
