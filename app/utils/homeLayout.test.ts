import { describe, expect, it } from 'vitest'
import type { HomeData } from '#shared/types/cms'
import { DEFAULT_HOME_SECTION_KEYS, emptyHomeSection, resolveHomeSections } from './homeLayout'

describe('resolveHomeSections', () => {
  it('falls back to the default layout when the request failed (no data)', () => {
    const sections = resolveHomeSections(null)

    expect(sections.map(section => section.key)).toEqual(DEFAULT_HOME_SECTION_KEYS)
    expect(sections[0]!.key).toBe('hero_slides')
    expect(sections.at(-1)!.key).toBe('faq')
    expect(resolveHomeSections(undefined)).toHaveLength(DEFAULT_HOME_SECTION_KEYS.length)
  })

  it('respects an admin who hid every section (successful but empty)', () => {
    const data: HomeData = { heroBadge: null, sections: [] }

    expect(resolveHomeSections(data)).toEqual([])
  })

  it('returns the admin layout as sent, in order', () => {
    const data: HomeData = {
      heroBadge: 'Trusted',
      sections: [emptyHomeSection('faq'), emptyHomeSection('custom_promo', 'image_text'), emptyHomeSection('hero_slides')],
    }

    expect(resolveHomeSections(data).map(section => section.key)).toEqual(['faq', 'custom_promo', 'hero_slides'])
  })
})

describe('emptyHomeSection', () => {
  it('has no admin content, so every component uses its built-in copy', () => {
    const section = emptyHomeSection('trust_stats')

    expect(section).toMatchObject({ key: 'trust_stats', type: 'trust_stats', heading: null, body: null, imageUrl: null, items: [], settings: {} })
  })

  it('keeps the how-it-works anchor that header and footer links point at', () => {
    expect(emptyHomeSection('how_it_works').anchor).toBe('how-it-works')
    expect(emptyHomeSection('faq').anchor).toBeNull()
  })
})
