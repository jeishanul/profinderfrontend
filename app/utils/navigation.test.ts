import { describe, expect, it } from 'vitest'
import type { NavigationData, NavLink, NavMenu, NavViewer } from '#shared/types/navigation'
import {
  compactFooterLinks,
  defaultNavigation,
  formatFooterText,
  isLinkVisible,
  socialIconFilled,
  socialIconName,
  visibleColumns,
  visibleLinks,
  visibleMenus,
} from './navigation'

const guest: NavViewer = { isAuthenticated: false, isProvider: false }
const customer: NavViewer = { isAuthenticated: true, isProvider: false }
const provider: NavViewer = { isAuthenticated: true, isProvider: true }

const link = (label: string, visibility: NavLink['visibility'] = 'all', url = `/${label.toLowerCase()}`): NavLink => ({ label, url, newTab: false, visibility, icon: null })
const menu = (key: string, items: NavLink[], source = 'manual', title: string | null = key): NavMenu => ({ key, title, source, items })

describe('isLinkVisible', () => {
  it.each([
    ['all', guest, true], ['all', customer, true], ['all', provider, true],
    ['guest', guest, true], ['guest', customer, false], ['guest', provider, false],
    ['auth', guest, false], ['auth', customer, true], ['auth', provider, true],
    ['non_provider', guest, true], ['non_provider', customer, true], ['non_provider', provider, false],
  ] as const)('%s link for %o is %s', (visibility, viewer, expected) => {
    expect(isLinkVisible({ visibility }, viewer)).toBe(expected)
  })
})

describe('visible links, menus and columns', () => {
  it('filters links by viewer', () => {
    const links = [link('Public'), link('Members', 'auth'), link('Guests', 'guest'), link('Pros', 'non_provider')]

    expect(visibleLinks(links, guest).map(l => l.label)).toEqual(['Public', 'Guests', 'Pros'])
    expect(visibleLinks(links, provider).map(l => l.label)).toEqual(['Public', 'Members'])
  })

  it('drops a menu left with no links for this visitor', () => {
    const menus = [menu('a', [link('One')]), menu('b', [link('Members', 'auth')])]

    expect(visibleMenus(menus, guest).map(m => m.key)).toEqual(['a'])
    expect(visibleMenus(menus, customer).map(m => m.key)).toEqual(['a', 'b'])
  })

  it('drops a column when every menu in it is empty for this visitor, and keeps the rest stacked', () => {
    const columns = [
      [menu('a', [link('One')]), menu('b', [link('Members', 'auth')])],
      [menu('c', [link('Members too', 'auth')])],
    ]

    expect(visibleColumns(columns, guest).map(column => column.map(m => m.key))).toEqual([['a']])
    expect(visibleColumns(columns, customer).map(column => column.map(m => m.key))).toEqual([['a', 'b'], ['c']])
  })

  it('does not change the menus it was given', () => {
    const menus = [menu('a', [link('One'), link('Members', 'auth')])]

    visibleMenus(menus, guest)

    expect(menus[0]!.items).toHaveLength(2)
  })
})

describe('compactFooterLinks', () => {
  const navigation: NavigationData = {
    header: [],
    footerColumns: [
      [menu('customers', [link('Browse')]), menu('company', [link('Terms'), link('Privacy', 'auth')], 'pages')],
      [menu('categories', [link('Plumbing')], 'categories')],
    ],
    footerRows: [menu('places', [link('Cebu')], 'locations')],
    footerBottom: [link('Sitemap')],
    mobileMore: { title: null, items: [] },
    social: [],
  }

  it('is the page lists plus the bottom links, nothing else', () => {
    expect(compactFooterLinks(navigation, customer).map(l => l.label)).toEqual(['Terms', 'Privacy', 'Sitemap'])
  })

  it('respects who is looking', () => {
    expect(compactFooterLinks(navigation, guest).map(l => l.label)).toEqual(['Terms', 'Sitemap'])
  })
})

describe('defaultNavigation (used when the navigation request fails)', () => {
  const t = (key: string) => `[${key}]`

  it('has the links the site had before the CMS', () => {
    const nav = defaultNavigation(t)

    expect(nav.header.map(l => [l.url, l.visibility])).toEqual([
      ['/#how-it-works', 'all'],
      ['/browse', 'all'],
      ['/jobs', 'all'],
      ['/blog', 'all'],
      ['/become-a-provider', 'non_provider'],
    ])
    expect(nav.header[0]!.label).toBe('[nav.howItWorks]')
    expect(nav.footerColumns).toHaveLength(1)
    expect(nav.footerColumns[0]!.map(m => m.title)).toEqual(['[footer.customers.heading]', '[footer.providers.heading]'])
    expect(nav.footerRows).toEqual([])
    expect(nav.mobileMore.items).toEqual([])
  })

  it('carries over the three social links the settings still know about', () => {
    const nav = defaultNavigation(t, { social: { facebook: 'https://facebook.com/pf', x: null, instagram: 'https://instagram.com/pf' } })

    expect(nav.social).toEqual([
      { network: 'facebook', label: 'Facebook', url: 'https://facebook.com/pf' },
      { network: 'instagram', label: 'Instagram', url: 'https://instagram.com/pf' },
    ])
    expect(defaultNavigation(t).social).toEqual([])
  })
})

describe('social icons', () => {
  it('maps a network to its icon, the website to the globe, and anything unknown to the globe', () => {
    expect(socialIconName('facebook')).toBe('facebook')
    expect(socialIconName('youtube')).toBe('youtube')
    expect(socialIconName('whatsapp')).toBe('whatsapp')
    expect(socialIconName('website')).toBe('globe')
    expect(socialIconName('myspace')).toBe('globe')
  })

  it('draws only Facebook as a solid glyph', () => {
    expect(socialIconFilled('facebook')).toBe(true)
    expect(socialIconFilled('instagram')).toBe(false)
  })
})

describe('formatFooterText', () => {
  it('fills in the year and the site name, wherever they appear', () => {
    expect(formatFooterText('© {year} {siteName}. All rights reserved.', { year: 2026, siteName: 'ProFinder' })).toBe('© 2026 ProFinder. All rights reserved.')
    expect(formatFooterText('{siteName} · {siteName} · {year}', { year: 2030, siteName: 'Acme' })).toBe('Acme · Acme · 2030')
  })

  it('leaves text without placeholders alone', () => {
    expect(formatFooterText('Made with care', { year: 2026, siteName: 'X' })).toBe('Made with care')
  })
})
