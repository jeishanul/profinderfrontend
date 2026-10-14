import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { HomeSection, HomeSectionItem } from '#shared/types/cms'
import CmsLink from './Link.vue'
import CmsBlock from './Block.vue'

function section(overrides: Partial<HomeSection> = {}): HomeSection {
  return {
    key: 'custom_promo',
    type: 'image_text',
    anchor: null,
    eyebrow: null,
    heading: null,
    subheading: null,
    body: null,
    imageUrl: null,
    imageAlt: null,
    backgroundImageUrl: null,
    ctaLabel: null,
    ctaUrl: null,
    settings: {},
    items: [],
    ...overrides,
  }
}

function item(overrides: Partial<HomeSectionItem> = {}): HomeSectionItem {
  return {
    title: 'Item',
    subtitle: null,
    description: null,
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

describe('CmsLink', () => {
  it('keeps a site path in-app', async () => {
    const wrapper = await mountSuspended(CmsLink, { props: { to: '/browse' }, slots: { default: 'Browse' } })

    expect(wrapper.find('a').attributes('href')).toBe('/browse')
    expect(wrapper.find('a').attributes('target')).toBeUndefined()
  })

  it('opens an external https link in a new tab without leaking the opener', async () => {
    const wrapper = await mountSuspended(CmsLink, { props: { to: 'https://example.com/x' }, slots: { default: 'Out' } })
    const link = wrapper.find('a')

    expect(link.attributes('href')).toBe('https://example.com/x')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('renders mailto, tel and in-page anchors as plain links', async () => {
    for (const to of ['mailto:help@example.com', 'tel:+639171234567', '#faq']) {
      const wrapper = await mountSuspended(CmsLink, { props: { to }, slots: { default: 'Go' } })

      expect(wrapper.find('a').attributes('href')).toBe(to)
      expect(wrapper.find('a').attributes('target')).toBeUndefined()
    }
  })

  it('never renders an unsafe or empty value as a link', async () => {
    for (const to of ['javascript:alert(1)', 'data:text/html,hi', '//evil.example.com', '', null]) {
      const wrapper = await mountSuspended(CmsLink, { props: { to }, slots: { default: 'Go' } })

      expect(wrapper.find('a').exists()).toBe(false)
      expect(wrapper.text()).toBe('Go')
    }
  })
})

describe('CmsBlock', () => {
  it('renders an image + text block with its body HTML, image and button', async () => {
    const wrapper = await mountSuspended(CmsBlock, {
      props: {
        section: section({
          type: 'image_text',
          anchor: 'promo',
          eyebrow: 'Why us',
          heading: 'Built on trust',
          body: '<p>We vet <strong>everyone</strong>.</p>',
          imageUrl: 'https://cdn.example.com/a.webp',
          imageAlt: 'Our team',
          ctaLabel: 'Get started',
          ctaUrl: '/browse',
        }),
      },
    })

    expect(wrapper.find('section#promo').exists()).toBe(true)
    expect(wrapper.text()).toContain('Why us')
    expect(wrapper.find('h2').text()).toBe('Built on trust')
    expect(wrapper.html()).toContain('<strong>everyone</strong>')
    expect(wrapper.find('img').attributes('alt')).toBe('Our team')
    expect(wrapper.find('a').attributes('href')).toBe('/browse')
    expect(wrapper.find('a').text()).toBe('Get started')
  })

  it('omits the button when there is no label or no url, and the image when there is none', async () => {
    const noLabel = await mountSuspended(CmsBlock, { props: { section: section({ heading: 'H', ctaUrl: '/browse' }) } })
    const noUrl = await mountSuspended(CmsBlock, { props: { section: section({ heading: 'H', ctaLabel: 'Go' }) } })

    expect(noLabel.find('a').exists()).toBe(false)
    expect(noUrl.find('a').exists()).toBe(false)
    expect(noLabel.find('img').exists()).toBe(false)
  })

  it('renders a CTA banner with its button only when label and url are both set', async () => {
    const full = await mountSuspended(CmsBlock, {
      props: { section: section({ type: 'cta_banner', heading: 'Join us', subheading: 'Today', ctaLabel: 'Sign up', ctaUrl: '/signup' }) },
    })
    const partial = await mountSuspended(CmsBlock, {
      props: { section: section({ type: 'cta_banner', heading: 'Join us', ctaUrl: '/signup' }) },
    })

    expect(full.text()).toContain('Join us')
    expect(full.text()).toContain('Today')
    expect(full.find('a').text()).toBe('Sign up')
    expect(partial.find('a').exists()).toBe(false)
  })

  it('renders features with icons, titles, text and optional links', async () => {
    const wrapper = await mountSuspended(CmsBlock, {
      props: {
        section: section({
          type: 'features_grid',
          heading: 'Features',
          settings: { columns: '4' },
          items: [
            item({ title: 'Fast', description: 'Very fast', icon: 'star' }),
            item({ title: 'Safe', description: 'Very safe', linkUrl: '/safety' }),
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('Fast')
    expect(wrapper.text()).toContain('Very safe')
    expect(wrapper.find('a[href="/safety"]').exists()).toBe(true)
    expect(wrapper.find('.lg\\:grid-cols-4').exists()).toBe(true)
  })

  it('renders nothing for a features grid with no items', async () => {
    const wrapper = await mountSuspended(CmsBlock, { props: { section: section({ type: 'features_grid', heading: 'Empty' }) } })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('renders a logo strip from the items that have an image, linking the ones with a url', async () => {
    const wrapper = await mountSuspended(CmsBlock, {
      props: {
        section: section({
          type: 'logo_strip',
          heading: 'As seen in',
          items: [
            item({ title: 'Acme', imageUrl: 'https://cdn.example.com/acme.png', linkUrl: 'https://acme.example.com' }),
            item({ title: 'No logo' }),
            item({ title: 'Globex', imageUrl: 'https://cdn.example.com/globex.png' }),
          ],
        }),
      },
    })

    expect(wrapper.findAll('img')).toHaveLength(2)
    expect(wrapper.find('a[href="https://acme.example.com"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('As seen in')
  })

  it('renders stats through the trust-stats component', async () => {
    const wrapper = await mountSuspended(CmsBlock, {
      props: { section: section({ type: 'stats', items: [item({ title: 'Verified pros', value: '1,200+' })] }) },
    })

    expect(wrapper.text()).toContain('1,200+')
    expect(wrapper.text()).toContain('Verified pros')
  })

  it('renders rich text and an image gallery', async () => {
    const rich = await mountSuspended(CmsBlock, { props: { section: section({ type: 'rich_text', heading: 'About', body: '<p>Hello <em>world</em></p>' }) } })
    const gallery = await mountSuspended(CmsBlock, {
      props: {
        section: section({
          type: 'image_gallery',
          heading: 'Our work',
          items: [item({ title: 'Kitchen', imageUrl: 'https://cdn.example.com/k.webp', imageAlt: 'A kitchen' }), item({ title: 'No image' })],
        }),
      },
    })

    expect(rich.find('h2').text()).toBe('About')
    expect(rich.html()).toContain('<em>world</em>')
    expect(gallery.findAll('img')).toHaveLength(1)
    expect(gallery.find('img').attributes('alt')).toBe('A kitchen')
  })

  it('renders nothing for a block type it does not know', async () => {
    const wrapper = await mountSuspended(CmsBlock, { props: { section: section({ type: 'hologram', heading: 'Future' }) } })

    expect(wrapper.html()).not.toContain('Future')
    expect(wrapper.find('section').exists()).toBe(false)
  })
})
