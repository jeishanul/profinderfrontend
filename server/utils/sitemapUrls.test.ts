// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { CORE_SITEMAP_PAGES, cleanPath, collectSitemapUrls, isSitemapSection, normalizePriority } from './sitemapUrls'
import type { SeoSitemapEntry, SitemapSection } from './sitemapUrls'

describe('cleanPath', () => {
  it('strips the origin of an absolute URL', () => {
    expect(cleanPath('https://profinder.vip/category/plumbing')).toBe('/category/plumbing')
    expect(cleanPath('http://127.0.0.1:8000/providers/maria-santos')).toBe('/providers/maria-santos')
  })

  it('ensures a leading slash and strips a trailing one', () => {
    expect(cleanPath('browse/')).toBe('/browse')
    expect(cleanPath('/jobs/')).toBe('/jobs')
    expect(cleanPath('/')).toBe('/')
  })
})

describe('normalizePriority', () => {
  it('rounds to a valid sitemap priority and defaults to 0.7', () => {
    expect(normalizePriority(0.84)).toBe(0.8)
    expect(normalizePriority(null)).toBe(0.7)
  })
})

describe('isSitemapSection', () => {
  it('accepts only the sections the backend feed knows', () => {
    expect(isSitemapSection('barangays')).toBe(true)
    expect(isSitemapSection('pages')).toBe(true)
    expect(isSitemapSection('everything')).toBe(false)
    expect(isSitemapSection(undefined)).toBe(false)
  })
})

describe('collectSitemapUrls', () => {
  const feed: Partial<Record<SitemapSection, SeoSitemapEntry[]>> = {
    categories: [{ loc: 'https://profinder.vip/category/plumbing', priority: 0.8, lastmod: '2026-10-18T10:00:00Z' }],
    provinces: [{ loc: 'https://profinder.vip/ph/cebu', priority: 0.7 }],
    cities: [{ loc: 'https://profinder.vip/ph/ncr-fourth-district/city-of-las-pinas', priority: 0.6 }],
    shop: [{ loc: 'https://profinder.vip/shop/t-shirt', priority: 0.7 }, { loc: 'https://profinder.vip/shop/', priority: 0.6 }],
  }

  it('asks for each section and lists the fixed pages first', async () => {
    const fetchSection = vi.fn(async (section: SitemapSection) => ({ urls: feed[section] ?? [] }))

    const urls = await collectSitemapUrls(fetchSection, ['categories', 'shop'], CORE_SITEMAP_PAGES)
    const locs = urls.map(url => url.loc)

    expect(fetchSection.mock.calls.map(call => call[0])).toEqual(['categories', 'shop'])
    expect(locs.slice(0, CORE_SITEMAP_PAGES.length)).toEqual(['/', '/browse', '/jobs', '/shop', '/blog'])
    expect(locs).toContain('/category/plumbing')
    expect(locs).toContain('/shop/t-shirt')
    expect(urls.find(url => url.loc === '/category/plumbing')?.lastmod).toBe('2026-10-18T10:00:00Z')
  })

  it('lists a page once, keeping its higher priority', async () => {
    const urls = await collectSitemapUrls(async section => feed[section] ?? [], ['shop'], CORE_SITEMAP_PAGES)

    expect(urls.filter(url => url.loc === '/shop')).toHaveLength(1)
    expect(urls.find(url => url.loc === '/shop')?.priority).toBe(0.8)
  })

  it('keeps the other sections when one fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const urls = await collectSitemapUrls(async (section) => {
      if (section === 'provinces') throw new Error('timeout')
      return { urls: feed[section] ?? [] }
    }, ['provinces', 'cities'])

    expect(urls.map(url => url.loc)).toEqual(['/ph/ncr-fourth-district/city-of-las-pinas'])
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('tags every URL with its sitemap file when one is named', async () => {
    const urls = await collectSitemapUrls(async section => feed[section] ?? [], ['provinces', 'cities'], [], 'locations')

    expect(urls).toHaveLength(2)
    expect(urls.every(url => url._sitemap === 'locations')).toBe(true)
  })
})
