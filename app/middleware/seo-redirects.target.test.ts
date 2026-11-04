import type { RouteLocationNormalized } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import middleware from './seo-redirects.global'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const go = (query: Record<string, string>) => middleware({ path: '/browse', query } as unknown as RouteLocationNormalized, {} as RouteLocationNormalized)

describe('seo-redirects: where an old /browse category link lands', () => {
  beforeEach(() => navigateToMock.mockReset())

  it('sends a single sub-category to its own page, keeping the other filters', () => {
    go({ categories: 'home-services', skills: 'aircon-technician', province: '0722' })

    expect(navigateToMock).toHaveBeenCalledWith(
      { path: '/category/home-services/aircon-technician', query: { province: '0722' } },
      { redirectCode: 301, external: false },
    )
  })

  it('keeps several sub-categories as a filter on the category page', () => {
    go({ categories: 'home-services', skills: 'aircon-technician,carpenter' })

    expect(navigateToMock).toHaveBeenCalledWith(
      { path: '/category/home-services', query: { skills: 'aircon-technician,carpenter' } },
      { redirectCode: 301, external: false },
    )
  })
})
