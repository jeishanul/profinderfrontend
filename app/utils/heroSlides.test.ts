import { describe, expect, it } from 'vitest'
import type { HomeSectionItem } from '#shared/types/cms'
import { buildHeroSlides } from './heroSlides'

function item(overrides: Partial<HomeSectionItem> = {}): HomeSectionItem {
  return {
    title: 'Headline',
    subtitle: null,
    description: 'Sub',
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

describe('buildHeroSlides', () => {
  it('maps the item fields onto a slide', () => {
    const [slide] = buildHeroSlides([item({ subtitle: 'New', ctaLabel: 'Book now', linkUrl: '/browse', imageAlt: 'A plumber' })])

    expect(slide).toMatchObject({ headline: 'Headline', sub: 'Sub', eyebrow: 'New', ctaLabel: 'Book now', ctaUrl: '/browse', imageAlt: 'A plumber' })
  })

  it('defaults to the split layout and the brand tone', () => {
    const [slide] = buildHeroSlides([item()])

    expect(slide).toMatchObject({ layout: 'split', tone: 'primary', overlay: 40, align: 'left', focalX: 50, focalY: 50 })
  })

  it('uses the background layout only when the slide has an image', () => {
    const [withImage, withoutImage] = buildHeroSlides([
      item({ imageUrl: '/storage/a.webp', meta: { layout: 'background' } }),
      item({ meta: { layout: 'background' } }),
    ])

    expect(withImage!.layout).toBe('background')
    expect(withoutImage!.layout).toBe('split')
  })

  it('reads tone, overlay, alignment and focal point from meta, clamped to their ranges', () => {
    const [slide] = buildHeroSlides([item({ meta: { tone: 'dark', overlay: 95, align: 'center', focalX: -10, focalY: 30 } })])

    expect(slide).toMatchObject({ tone: 'dark', overlay: 80, align: 'center', focalX: 0, focalY: 30 })
  })

  it('ignores values it does not know', () => {
    const [slide] = buildHeroSlides([item({ meta: { tone: 'neon', layout: 'sideways', align: 'upside-down', overlay: 'lots' } })])

    expect(slide).toMatchObject({ tone: 'primary', layout: 'split', align: 'left', overlay: 40 })
  })

  it('carries the phone image and a second button', () => {
    const [slide] = buildHeroSlides([item({
      imageUrl: '/storage/desktop.webp',
      secondaryImageUrl: '/storage/phone.webp',
      meta: { layout: 'background', secondaryCtaLabel: 'How it works', secondaryCtaUrl: '/#how-it-works' },
    })])

    expect(slide).toMatchObject({ mobileImageUrl: '/storage/phone.webp', secondaryCtaLabel: 'How it works', secondaryCtaUrl: '/#how-it-works' })
  })

  it('drops links that are not safe', () => {
    const [slide] = buildHeroSlides([item({ linkUrl: 'javascript:alert(1)', meta: { secondaryCtaUrl: 'data:text/html,hi' } })])

    expect(slide!.ctaUrl).toBeNull()
    expect(slide!.secondaryCtaUrl).toBeNull()
  })

  it('gives each slide a default icon and a stable id', () => {
    const slides = buildHeroSlides([item(), item(), item({ icon: 'star' })])

    expect(slides.map(slide => slide.id)).toEqual(['cms-0', 'cms-1', 'cms-2'])
    expect(slides[2]!.icon).toBe('star')
    expect(slides[0]!.icon).toBeTruthy()
  })

  it('returns no slides for no items, so the built-in ones are used', () => {
    expect(buildHeroSlides([])).toEqual([])
  })
})
