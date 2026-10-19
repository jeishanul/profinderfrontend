import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { HomeSection, HomeSectionItem } from '#shared/types/cms'
import { emptyHomeSection } from '~/utils/homeLayout'
import HeroSlider from './HeroSlider.vue'

function slide(overrides: Partial<HomeSectionItem> = {}): HomeSectionItem {
  return {
    title: 'Slide headline',
    subtitle: null,
    description: 'Slide sub',
    icon: null,
    value: null,
    imageUrl: null,
    imageAlt: null,
    secondaryImageUrl: null,
    linkUrl: null,
    ctaLabel: null,
    meta: {},
    ...overrides,
  }
}

function mountHero(items: HomeSectionItem[] = [], extra: Partial<HomeSection> = {}, badge: string | null = null) {
  return mountSuspended(HeroSlider, {
    props: { section: { ...emptyHomeSection('hero_slides'), items, ...extra }, badge, categories: [] },
    // The search bar loads provinces from the API; it isn't what these tests are about.
    global: { stubs: { MarketplaceServiceSearchBar: true } },
  })
}

describe('HeroSlider', () => {
  it('shows the built-in three slides when the admin has none', async () => {
    const wrapper = await mountHero()

    expect(wrapper.find('h1').text()).toBe('Home services, done right by pros near you.')
    expect(wrapper.findAll('button[aria-label^="Go to slide"]')).toHaveLength(3)
  })

  it('shows the admin slides instead of the built-in ones', async () => {
    const wrapper = await mountHero([slide({ title: 'First' }), slide({ title: 'Second' })])

    expect(wrapper.find('h1').text()).toBe('First')
    expect(wrapper.findAll('button[aria-label^="Go to slide"]')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Home services, done right')
  })

  it('uses the badge text from the CMS, else the built-in one', async () => {
    expect((await mountHero([], {}, 'Trusted by 1,200+ verified pros')).text()).toContain('Trusted by 1,200+ verified pros')
    expect((await mountHero([], {}, '  ')).text()).toContain('Trusted by verified pros')
  })

  it('prefers the slide eyebrow for the badge text when provided', async () => {
    const wrapper = await mountHero([slide({ subtitle: 'Special Offer' })], {}, 'Default Badge')
    expect(wrapper.text()).toContain('Special Offer')
    expect(wrapper.text()).not.toContain('Default Badge')
  })

  it('moves between slides with the arrows and the dots', async () => {
    const wrapper = await mountHero([slide({ title: 'First' }), slide({ title: 'Second' }), slide({ title: 'Third' })])

    await wrapper.find('button[aria-label="Next slide"]').trigger('click')
    expect(wrapper.find('h1').text()).toBe('Second')

    await wrapper.find('button[aria-label="Previous slide"]').trigger('click')
    await wrapper.find('button[aria-label="Previous slide"]').trigger('click')
    expect(wrapper.find('h1').text()).toBe('Third')

    await wrapper.find('button[aria-label="Go to slide 1"]').trigger('click')
    expect(wrapper.find('h1').text()).toBe('First')
  })

  it('responds to the arrow keys', async () => {
    const wrapper = await mountHero([slide({ title: 'First' }), slide({ title: 'Second' })])

    await wrapper.find('[role="region"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('h1').text()).toBe('Second')
  })

  it('has no controls for a single slide', async () => {
    const wrapper = await mountHero([slide()])

    expect(wrapper.find('button[aria-label="Next slide"]').exists()).toBe(false)
    expect(wrapper.findAll('button[aria-label^="Go to slide"]')).toHaveLength(0)
  })

  it('renders the button with the admin label and link, and falls back to "Learn more"', async () => {
    const labelled = await mountHero([slide({ linkUrl: '/browse', ctaLabel: 'Book now' })])
    const unlabelled = await mountHero([slide({ linkUrl: '/browse' })])

    expect(labelled.find('a[href="/browse"]').text()).toBe('Book now')
    expect(unlabelled.find('a[href="/browse"]').text()).toBe('Learn more')
  })

  it('renders a second button when the slide has one', async () => {
    const wrapper = await mountHero([slide({ linkUrl: '/browse', ctaLabel: 'Book', meta: { secondaryCtaLabel: 'How it works', secondaryCtaUrl: '/#how-it-works' } })])

    expect(wrapper.find('a[href="/#how-it-works"]').text()).toBe('How it works')
  })

  it('never renders an unsafe link', async () => {
    const wrapper = await mountHero([slide({ linkUrl: 'javascript:alert(1)' })])

    expect(wrapper.find('a[href^="javascript"]').exists()).toBe(false)
    expect(wrapper.find('h1 ~ div a').exists()).toBe(false)
  })

  it('split layout: the side image replaces the icon', async () => {
    const withImage = await mountHero([slide({ imageUrl: 'https://cdn.example.com/a.webp', imageAlt: 'A pro' })])
    const withoutImage = await mountHero([slide()])

    expect(withImage.find('img').attributes('alt')).toBe('A pro')
    expect(withoutImage.find('img').exists()).toBe(false)
  })

  it('background layout: a full-bleed photo with an overlay and the focal point', async () => {
    const wrapper = await mountHero([slide({ imageUrl: 'https://cdn.example.com/a.webp', imageAlt: 'A pro', meta: { layout: 'background', overlay: 60, focalX: 20, focalY: 70 } })])

    const image = wrapper.find('img')
    expect(image.attributes('alt')).toBe('A pro')
    expect(image.attributes('style')).toContain('object-position: 20% 70%')
    expect(wrapper.find('.bg-black[style*="opacity: 0.6"]').exists()).toBe(true)
    expect(wrapper.find('h1').classes()).toContain('text-white')
  })

  it('background layout: a phone image gets its own element shown only on small screens', async () => {
    const wrapper = await mountHero([slide({ imageUrl: 'https://cdn.example.com/d.webp', secondaryImageUrl: 'https://cdn.example.com/m.webp', meta: { layout: 'background' } })])

    const images = wrapper.findAll('img')
    expect(images).toHaveLength(2)
    expect(images[0]!.classes()).toContain('md:hidden')
    expect(images[1]!.classes()).toContain('hidden')
  })

  it('only keeps the neighbouring backgrounds in the page, not every photo', async () => {
    const photo = (n: number) => slide({ title: `S${n}`, imageUrl: `https://cdn.example.com/${n}.webp`, meta: { layout: 'background' } })
    const wrapper = await mountHero([photo(1), photo(2), photo(3), photo(4), photo(5)])

    // previous (5), current (1) and next (2)
    expect(wrapper.findAll('img')).toHaveLength(3)
  })

  it('a background slide with no image falls back to the split look', async () => {
    const wrapper = await mountHero([slide({ meta: { layout: 'background' } })])

    expect(wrapper.find('h1').classes()).not.toContain('text-white')
  })

  it('anchors the section for menu links', async () => {
    const wrapper = await mountHero([], { anchor: 'hero' })

    expect(wrapper.find('section#hero').exists()).toBe(true)
  })

  it('hands the admin search copy to the search bar', async () => {
    const wrapper = await mountHero([], { settings: { searchPlaceholder: 'Find a pro', searchButtonLabel: 'Go' } })
    const bar = wrapper.findComponent({ name: 'MarketplaceServiceSearchBar' })

    expect(bar.props('placeholder')).toBe('Find a pro')
    expect(bar.props('submitLabel')).toBe('Go')
  })
})

describe('HeroSlider panel colours', () => {
  it('the panel follows the slide on screen: dark for a dark slide, light tone for a light one', async () => {
    // Test Utils stubs <Transition> by default, which would skip the leave hook this behaviour hangs on.
    const wrapper = await mountSuspended(HeroSlider, {
      props: {
        section: { ...emptyHomeSection('hero_slides'), items: [slide({ title: 'Dark', meta: { tone: 'dark' } }), slide({ title: 'Light', meta: { tone: 'accent' } })] },
        badge: null,
        categories: [],
      },
      global: { stubs: { MarketplaceServiceSearchBar: true, transition: false } },
    })
    const panel = wrapper.find('[role="region"]')

    expect(panel.classes()).toContain('bg-slate-900')

    await wrapper.find('button[aria-label="Next slide"]').trigger('click')
    // Wait for the old text to finish leaving; the panel switches then, not before.
    await vi.waitFor(() => expect(panel.classes()).toContain('bg-accent-50'))
    expect(panel.classes()).not.toContain('bg-slate-900')
    expect(wrapper.find('h1').text()).toBe('Light')
  })
})
