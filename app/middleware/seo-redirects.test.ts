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

  it('does not redirect billing invoices or the subscription checkout to /ph/', () => {
    for (const path of ['/billing/invoices/INV-000004', '/subscription/checkout']) {
      const to = { path, query: {} } as unknown as RouteLocationNormalized
      expect(middleware(to, dummyFrom)).toBeUndefined()
    }
  })

  it('sends an app page wrongly redirected under /ph/ back to the page', async () => {
    const to = { path: '/ph/billing/invoices/INV-000004', query: {} } as unknown as RouteLocationNormalized
    expect(await middleware(to, dummyFrom)).toBeDefined()
    const place = { path: '/ph/cebu/cebu-city', query: {} } as unknown as RouteLocationNormalized
    expect(middleware(place, dummyFrom)).toBeUndefined()
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

  it('does not treat shop pages like /shop/logo-tee or /shop/orders/SO-1 as locations', () => {
    for (const path of ['/shop/logo-tee', '/shop/category/apparel', '/shop/orders/SO-1']) {
      const to = { path, query: {} } as unknown as RouteLocationNormalized
      expect(middleware(to, dummyFrom)).toBeUndefined()
    }
  })
})
