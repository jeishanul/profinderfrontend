import { describe, expect, it, vi } from 'vitest'
import { PagedRefreshRegistry, createLatestGuard } from './pagedRegistry'

describe('PagedRefreshRegistry', () => {
  it('refreshes a registered list in place and leaves the rest to the fallback', async () => {
    const registry = new PagedRefreshRegistry()
    const purchases = vi.fn().mockResolvedValue(undefined)
    const fallback = vi.fn().mockResolvedValue(undefined)
    registry.register('dashboard-purchases', purchases)

    await registry.refresh(['dashboard-purchases', 'dashboard-summary'], fallback)

    expect(purchases).toHaveBeenCalledTimes(1)
    expect(fallback).toHaveBeenCalledWith(['dashboard-summary'])
  })

  it('does not call the fallback when every key belongs to a registered list', async () => {
    const registry = new PagedRefreshRegistry()
    registry.register('a', vi.fn().mockResolvedValue(undefined))
    const fallback = vi.fn()

    await registry.refresh(['a'], fallback)

    expect(fallback).not.toHaveBeenCalled()
  })

  it('stops refreshing a list once it has been unregistered', async () => {
    const registry = new PagedRefreshRegistry()
    const refresher = vi.fn().mockResolvedValue(undefined)
    const unregister = registry.register('a', refresher)
    unregister()
    const fallback = vi.fn().mockResolvedValue(undefined)

    await registry.refresh(['a'], fallback)

    expect(refresher).not.toHaveBeenCalled()
    expect(fallback).toHaveBeenCalledWith(['a'])
  })

  it('refreshes every list that shares a key (e.g. two mounted views)', async () => {
    const registry = new PagedRefreshRegistry()
    const first = vi.fn().mockResolvedValue(undefined)
    const second = vi.fn().mockResolvedValue(undefined)
    registry.register('a', first)
    registry.register('a', second)

    await registry.refresh(['a'], vi.fn())

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})

describe('createLatestGuard', () => {
  it('marks a response stale once a newer generation has started', () => {
    const guard = createLatestGuard()
    const token = guard.token()
    expect(guard.isStale(token)).toBe(false)

    guard.bump()

    expect(guard.isStale(token)).toBe(true)
    expect(guard.isStale(guard.token())).toBe(false)
  })
})
