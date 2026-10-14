import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useNuxtApp } from '#app'
import type { GalleryItem, GalleryTab, ServiceCategory } from '#shared/types/marketplace'
import { emptyHomeSection } from '~/utils/homeLayout'
import UiAvatar from '~/components/ui/Avatar.vue'
import AppStoreBadges from './AppStoreBadges.vue'
import CategoryCarousel from './CategoryCarousel.vue'
import JobsGallery from './JobsGallery.vue'

/** Put settings where `useSiteSettings` reads them, as if `app.vue` had fetched them. */
function provideSettings(value: Record<string, unknown> | undefined) {
  useNuxtApp().payload.data['site-settings'] = value
}

const category = (id: string, overrides: Partial<ServiceCategory> = {}): ServiceCategory => ({ id, name: id.toUpperCase(), icon: 'wrench', providerCount: 3, ...overrides })

describe('category pictures', () => {
  it('shows the category picture with its alt text, and the icon when there is none', async () => {
    const wrapper = await mountSuspended(CategoryCarousel, {
      props: {
        section: emptyHomeSection('categories'),
        categories: [category('plumbing', { imageUrl: 'https://cdn.example.com/p.webp', imageAlt: 'A plumber' }), category('cleaning')],
      },
    })

    const tiles = wrapper.findAll('a[href^="/category/"]')
    expect(tiles[0]!.find('img').attributes('alt')).toBe('A plumber')
    expect(tiles[0]!.find('svg').exists()).toBe(false)
    expect(tiles[1]!.find('img').exists()).toBe(false)
    expect(tiles[1]!.find('svg').exists()).toBe(true)
  })
})

describe('JobsGallery picture fallbacks', () => {
  afterEach(() => provideSettings(undefined))

  const tile = (overrides: Partial<GalleryItem> = {}): GalleryItem => ({ categoryId: 'plumbing', categoryName: 'Plumbing', title: 'Kitchen', imageUrl: null, imageAlt: null, ...overrides })
  const mountGallery = (items: GalleryItem[], categories: ServiceCategory[] = []) => mountSuspended(JobsGallery, {
    props: { section: emptyHomeSection('jobs_gallery'), itemsByTab: { home: items, recommended: [], trending: [] } as Record<GalleryTab, GalleryItem[]>, categories },
  })

  it('uses the tile\'s own photo first', async () => {
    provideSettings({ defaultGalleryImageUrl: 'https://cdn.example.com/default.webp' })
    const wrapper = await mountGallery([tile({ imageUrl: 'https://cdn.example.com/own.webp', imageAlt: 'Own' })], [category('plumbing', { imageUrl: 'https://cdn.example.com/cat.webp' })])

    expect(wrapper.find('img').attributes('src')).toContain('own.webp')
    expect(wrapper.find('img').attributes('alt')).toBe('Own')
  })

  it('then the category\'s picture', async () => {
    provideSettings({ defaultGalleryImageUrl: 'https://cdn.example.com/default.webp' })
    const wrapper = await mountGallery([tile()], [category('plumbing', { imageUrl: 'https://cdn.example.com/cat.webp' })])

    expect(wrapper.find('img').attributes('src')).toContain('cat.webp')
  })

  it('then the site\'s default gallery photo', async () => {
    provideSettings({ defaultGalleryImageUrl: 'https://cdn.example.com/default.webp' })
    const wrapper = await mountGallery([tile()], [category('plumbing')])

    expect(wrapper.find('img').attributes('src')).toContain('default.webp')
  })

  it('and only then the icon placeholder', async () => {
    provideSettings({ defaultGalleryImageUrl: null })
    const wrapper = await mountGallery([tile()], [category('plumbing')])

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})

describe('AppStoreBadges', () => {
  afterEach(() => provideSettings(undefined))

  it('shows text badges for the stores that have a link', async () => {
    provideSettings({ playStoreUrl: 'https://play.google.com/pf', appStoreUrl: null })
    const wrapper = await mountSuspended(AppStoreBadges)

    expect(wrapper.findAll('a')).toHaveLength(1)
    expect(wrapper.find('a').text()).toContain('Google Play')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('swaps in the badge image the admin uploaded for that store only', async () => {
    provideSettings({ playStoreUrl: 'https://play.google.com/pf', appStoreUrl: 'https://apps.apple.com/pf', playStoreBadgeUrl: 'https://cdn.example.com/play.png', appStoreBadgeUrl: null })
    const wrapper = await mountSuspended(AppStoreBadges)

    const [play, apple] = wrapper.findAll('a')
    expect(play!.find('img').attributes('alt')).toBe('Google Play')
    expect(play!.attributes('aria-label')).toBe('Google Play')
    expect(apple!.find('img').exists()).toBe(false)
    expect(apple!.text()).toContain('App Store')
  })

  it('shows nothing without a link', async () => {
    provideSettings({ playStoreUrl: null, appStoreUrl: null, playStoreBadgeUrl: 'https://cdn.example.com/play.png' })
    const wrapper = await mountSuspended(AppStoreBadges)

    expect(wrapper.find('a').exists()).toBe(false)
  })
})

describe('UiAvatar', () => {
  afterEach(() => provideSettings(undefined))

  it('shows the person\'s photo, then the default profile photo, then initials', async () => {
    provideSettings({ defaultAvatarUrl: 'https://cdn.example.com/default.webp' })
    const own = await mountSuspended(UiAvatar, { props: { name: 'Jane Doe', src: 'https://cdn.example.com/jane.webp' } })
    const fallback = await mountSuspended(UiAvatar, { props: { name: 'Jane Doe' } })

    expect(own.find('img').attributes('src')).toContain('jane.webp')
    expect(fallback.find('img').attributes('src')).toContain('default.webp')

    provideSettings({ defaultAvatarUrl: null })
    const initials = await mountSuspended(UiAvatar, { props: { name: 'Jane Doe' } })

    expect(initials.find('img').exists()).toBe(false)
    expect(initials.text()).toBe('JD')
  })
})
