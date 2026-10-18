// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const defineSitemapEventHandlerMock = vi.fn((handler: unknown) => handler)
const callApiMock = vi.fn()

vi.stubGlobal('defineSitemapEventHandler', defineSitemapEventHandlerMock)
vi.stubGlobal('callApi', callApiMock)

beforeEach(() => {
  callApiMock.mockReset()
})

afterEach(() => {
  vi.resetModules()
})

async function getModule() {
  return await import('./urls') as {
    default: (event: unknown) => Promise<{ loc: string, changefreq?: string, priority?: number, lastmod?: string }[]>
    cleanPath: (loc: string) => string
  }
}

describe('cleanPath helper', () => {
  it('strips full URL origin and returns normalized path', async () => {
    const { cleanPath } = await getModule()
    expect(cleanPath('https://profinder.vip/category/plumbing')).toBe('/category/plumbing')
    expect(cleanPath('http://127.0.0.1:8000/providers/maria-santos')).toBe('/providers/maria-santos')
  })

  it('ensures leading slash and strips trailing slash', async () => {
    const { cleanPath } = await getModule()
    expect(cleanPath('browse/')).toBe('/browse')
    expect(cleanPath('/jobs/')).toBe('/jobs')
    expect(cleanPath('/')).toBe('/')
  })
})

describe('Sitemap URLs handler', () => {
  it('includes core landing pages and maps dynamic pages and SEO entries', async () => {
    callApiMock.mockImplementation(async (_event: unknown, path: string) => {
      if (path === '/pages') {
        return [
          { slug: 'terms-of-service', title: 'Terms of Service' },
          { slug: 'privacy-policy', title: 'Privacy Policy' },
        ]
      }
      if (path === '/seo/sitemap-urls') {
        return {
          urls: [
            {
              loc: 'https://profinder.vip/category/plumbing',
              changefreq: 'weekly',
              priority: 0.8,
              lastmod: '2026-10-18T10:00:00Z',
            },
            {
              loc: 'https://profinder.vip/providers/juan-delacruz',
              changefreq: 'weekly',
              priority: 0.7,
              lastmod: '2026-10-18T09:00:00Z',
            },
            {
              loc: 'https://profinder.vip/jobs/need-house-painter',
              changefreq: 'daily',
              priority: 0.8,
              lastmod: '2026-10-18T11:00:00Z',
            },
            {
              loc: 'https://profinder.vip/blog/top-plumbers-guide',
              changefreq: 'weekly',
              priority: 0.6,
              lastmod: '2026-10-17T12:00:00Z',
            },
          ],
        }
      }
      return []
    })

    const { default: handler } = await getModule()
    const urls = await handler({})

    const locs = urls.map(u => u.loc)

    // 1. Core landing pages
    expect(locs).toContain('/')
    expect(locs).toContain('/browse')
    expect(locs).toContain('/jobs')
    expect(locs).toContain('/blog')

    const home = urls.find(u => u.loc === '/')
    expect(home?.priority).toBe(1)
    expect(home?.changefreq).toBe('daily')

    // 2. Legal pages
    expect(locs).toContain('/legal/terms-of-service')
    expect(locs).toContain('/legal/privacy-policy')

    // 3. Dynamic entities
    expect(locs).toContain('/category/plumbing')
    expect(locs).toContain('/providers/juan-delacruz')
    expect(locs).toContain('/jobs/need-house-painter')
    expect(locs).toContain('/blog/top-plumbers-guide')
  })

  it('deduplicates duplicate URLs', async () => {
    callApiMock.mockImplementation(async (_event: unknown, path: string) => {
      if (path === '/pages') {
        return [{ slug: 'about', title: 'About' }]
      }
      if (path === '/seo/sitemap-urls') {
        return {
          urls: [
            { loc: '/legal/about', priority: 0.5 },
            { loc: '/browse', priority: 0.9 },
          ],
        }
      }
      return []
    })

    const { default: handler } = await getModule()
    const urls = await handler({})

    const aboutMatches = urls.filter(u => u.loc === '/legal/about')
    expect(aboutMatches).toHaveLength(1)

    const browseMatches = urls.filter(u => u.loc === '/browse')
    expect(browseMatches).toHaveLength(1)
  })

  it('resiliently handles failure in one endpoint without breaking the sitemap', async () => {
    callApiMock.mockImplementation(async (_event: unknown, path: string) => {
      if (path === '/pages') {
        throw new Error('Backend database connection timeout')
      }
      if (path === '/seo/sitemap-urls') {
        return {
          urls: [
            { loc: '/providers/juan-delacruz', priority: 0.7 },
          ],
        }
      }
      return []
    })

    const { default: handler } = await getModule()
    const urls = await handler({})

    expect(urls.length).toBeGreaterThan(0)
    expect(urls.map(u => u.loc)).toContain('/providers/juan-delacruz')
    expect(urls.map(u => u.loc)).toContain('/')
  })
})
