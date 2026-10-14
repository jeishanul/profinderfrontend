import { describe, expect, it } from 'vitest'
import { cmsOptionalText, cmsText, isInternalPath, isSafeLink, sectionAnchor, sectionNumber, sectionOptionalText, sectionText } from './cms'
import { emptyHomeSection } from './homeLayout'

describe('cmsText', () => {
  it('uses the admin text when filled in', () => {
    expect(cmsText('Our heading', 'Default')).toBe('Our heading')
  })

  it('falls back when the field is empty, whitespace, null or undefined', () => {
    expect(cmsText('', 'Default')).toBe('Default')
    expect(cmsText('   ', 'Default')).toBe('Default')
    expect(cmsText(null, 'Default')).toBe('Default')
    expect(cmsText(undefined, 'Default')).toBe('Default')
  })

  it('trims the admin text', () => {
    expect(cmsText('  Hi  ', 'Default')).toBe('Hi')
  })

  it('cmsOptionalText returns null instead of a default', () => {
    expect(cmsOptionalText('  ')).toBeNull()
    expect(cmsOptionalText(null)).toBeNull()
    expect(cmsOptionalText(' Go ')).toBe('Go')
  })
})

describe('isSafeLink', () => {
  it.each([
    '/browse',
    '/#how-it-works',
    '#faq',
    'https://example.com/a?b=1',
    'http://example.com',
    'mailto:help@example.com',
    'tel:+639171234567',
  ])('allows %s', (url) => {
    expect(isSafeLink(url)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.example.com',
    '/\\evil.example.com',
    'example.com',
    'browse',
    'https://',
    '/a b',
    '',
    null,
    undefined,
  ])('rejects %s', (url) => {
    expect(isSafeLink(url as string | null | undefined)).toBe(false)
  })
})

describe('isInternalPath', () => {
  it('is true for site paths only', () => {
    expect(isInternalPath('/browse')).toBe(true)
    expect(isInternalPath('/')).toBe(true)
    expect(isInternalPath('//host')).toBe(false)
    expect(isInternalPath('https://example.com')).toBe(false)
    expect(isInternalPath('#top')).toBe(false)
  })
})

describe('section options', () => {
  it('sectionNumber reads numbers and numeric strings, else the fallback', () => {
    expect(sectionNumber({ maxItems: 12 }, 'maxItems', 4)).toBe(12)
    expect(sectionNumber({ maxItems: '8' }, 'maxItems', 4)).toBe(8)
    expect(sectionNumber({ maxItems: 0 }, 'maxItems', 4)).toBe(0)
    expect(sectionNumber({}, 'maxItems', 4)).toBe(4)
    expect(sectionNumber(undefined, 'maxItems', 4)).toBe(4)
    expect(sectionNumber({ maxItems: '' }, 'maxItems', 4)).toBe(4)
    expect(sectionNumber({ maxItems: 'abc' }, 'maxItems', 4)).toBe(4)
  })

  it('sectionText falls back when the option is empty or not text', () => {
    expect(sectionText({ bannerText: 'Guaranteed' }, 'bannerText', 'Default')).toBe('Guaranteed')
    expect(sectionText({ bannerText: '  ' }, 'bannerText', 'Default')).toBe('Default')
    expect(sectionText({ bannerText: 5 }, 'bannerText', 'Default')).toBe('Default')
    expect(sectionText(undefined, 'bannerText', 'Default')).toBe('Default')
  })

  it('sectionOptionalText returns null when empty', () => {
    expect(sectionOptionalText({ searchPlaceholder: 'Find a pro' }, 'searchPlaceholder')).toBe('Find a pro')
    expect(sectionOptionalText({ searchPlaceholder: '' }, 'searchPlaceholder')).toBeNull()
    expect(sectionOptionalText({}, 'searchPlaceholder')).toBeNull()
  })

  it('sectionAnchor prefers the admin anchor over the fallback', () => {
    const section = emptyHomeSection('faq')
    expect(sectionAnchor(section)).toBeUndefined()
    expect(sectionAnchor(section, 'faq')).toBe('faq')
    expect(sectionAnchor({ ...section, anchor: 'questions' }, 'faq')).toBe('questions')
  })
})
