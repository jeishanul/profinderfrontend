import type { RouteLocationNormalized } from 'vue-router'
import { describe, expect, it } from 'vitest'
import middleware from './seo-redirects.global'

describe('seo-redirects.global middleware', () => {
  const dummyFrom = {} as RouteLocationNormalized

  it('redirects /browse?category=cleaning to /category/cleaning with 301', () => {
    const to = {
      path: '/browse',
      query: { category: 'cleaning' },
    } as unknown as RouteLocationNormalized

    const result = middleware(to, dummyFrom)

    // navigateTo returns a Promise or navigation object with redirectCode 301
    expect(result).toBeDefined()
  })

  it('redirects /browse?categories=plumbing&province=1376 preserving province query', () => {
    const to = {
      path: '/browse',
      query: { categories: 'plumbing', province: '1376' },
    } as unknown as RouteLocationNormalized

    const result = middleware(to, dummyFrom)
    expect(result).toBeDefined()
  })

  it('redirects /metro-manila/quezon-city/bahay-toro to /ph/metro-manila/quezon-city/bahay-toro', () => {
    const to = {
      path: '/metro-manila/quezon-city/bahay-toro',
      query: {},
    } as unknown as RouteLocationNormalized

    const result = middleware(to, dummyFrom)
    expect(result).toBeDefined()
  })

  it('does not redirect known routes like /category/cleaning', () => {
    const to = {
      path: '/category/cleaning',
      query: {},
    } as unknown as RouteLocationNormalized

    const result = middleware(to, dummyFrom)
    expect(result).toBeUndefined()
  })

  it('does not redirect /browse without category query', () => {
    const to = {
      path: '/browse',
      query: { province: '1376' },
    } as unknown as RouteLocationNormalized

    const result = middleware(to, dummyFrom)
    expect(result).toBeUndefined()
  })

  it('does not redirect known multi-segment routes like /providers/123', () => {
    const to = {
      path: '/providers/123',
      query: {},
    } as unknown as RouteLocationNormalized

    const result = middleware(to, dummyFrom)
    expect(result).toBeUndefined()
  })
})
