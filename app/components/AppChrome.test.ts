import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useNuxtApp } from '#app'
import type { NavigationData, NavLink, NavMenu } from '#shared/types/navigation'
import AppFooter from './AppFooter.vue'
import AppFooterCompact from './AppFooterCompact.vue'
import AppHeader from './AppHeader.vue'

const link = (label: string, url: string, extra: Partial<NavLink> = {}): NavLink => ({ label, url, newTab: false, visibility: 'all', icon: null, ...extra })
const menu = (key: string, title: string | null, items: NavLink[], source = 'manual'): NavMenu => ({ key, title, source, items })

function navigation(overrides: Partial<NavigationData> = {}): NavigationData {
  return {
    header: [link('How it works', '/#how-it-works'), link('Browse', '/browse'), link('Members only', '/members', { visibility: 'auth' }), link('Become a pro', '/become-a-provider', { visibility: 'non_provider' })],
    footerColumns: [
      [menu('customers', 'For customers', [link('Browse services', '/browse'), link('Docs', 'https://docs.example.com', { newTab: true })]), menu('providers', 'For providers', [link('Become a provider', '/become-a-provider')])],
      [menu('company', 'Company', [link('Terms', '/legal/terms'), link('Privacy', '/legal/privacy')], 'pages')],
    ],
    footerRows: [menu('places', 'Popular locations', [link('Cebu', '/ph/cebu')], 'locations')],
    footerBottom: [link('Sitemap', '/sitemap')],
    mobileMore: { title: null, items: [] },
    social: [{ network: 'facebook', label: 'Facebook', url: 'https://facebook.com/pf' }, { network: 'youtube', label: 'YouTube', url: 'https://youtube.com/pf' }],
    ...overrides,
  }
}

/** Put a payload where `useNuxtData` reads it, as if `app.vue` had fetched it. */
function provide(key: string, value: unknown) {
  const nuxtApp = useNuxtApp()
  nuxtApp.payload.data[key] = value
}

const stubs = { MarketplaceServiceSearchBar: true, UiThemeToggle: true, UiLocaleSwitcher: true, UiQrCode: true, LazyUiQrCode: true, MarketplaceAppStoreBadges: true }

describe('AppFooter', () => {
  afterEach(() => {
    provide('site-navigation', undefined)
    provide('site-settings', undefined)
  })

  it('renders the admin\'s columns with stacked menus under their headings, in order', async () => {
    provide('site-navigation', navigation())
    const wrapper = await mountSuspended(AppFooter, { global: { stubs } })

    const headings = wrapper.findAll('p.uppercase').map(p => p.text())
    expect(headings.slice(0, 4)).toEqual(['For customers', 'For providers', 'Company', 'Contact'])
    expect(wrapper.find('a[href="/browse"]').text()).toBe('Browse services')
    expect(wrapper.find('a[href="/legal/terms"]').text()).toBe('Terms')
  })

  it('opens a link set to open in a new tab safely', async () => {
    provide('site-navigation', navigation())
    const wrapper = await mountSuspended(AppFooter, { global: { stubs } })

    const docs = wrapper.find('a[href="https://docs.example.com"]')
    expect(docs.attributes('target')).toBe('_blank')
    expect(docs.attributes('rel')).toBe('noopener noreferrer')
  })

  it('shows the link rows, the bottom links and every social network with its own label', async () => {
    provide('site-navigation', navigation())
    const wrapper = await mountSuspended(AppFooter, { global: { stubs } })

    expect(wrapper.find('a[href="/ph/cebu"]').text()).toBe('Cebu')
    expect(wrapper.text()).toContain('Popular locations')
    expect(wrapper.find('a[href="/sitemap"]').text()).toBe('Sitemap')
    expect(wrapper.find('a[aria-label="Facebook"]').attributes('href')).toBe('https://facebook.com/pf')
    expect(wrapper.find('a[aria-label="YouTube"]').attributes('href')).toBe('https://youtube.com/pf')
    expect(wrapper.find('a[aria-label="YouTube"] svg').exists()).toBe(true)
  })

  it('makes the grid as wide as the columns it has', async () => {
    provide('site-navigation', navigation())
    const wrapper = await mountSuspended(AppFooter, { global: { stubs } })

    // Brand + 2 columns + contact + app.
    expect(wrapper.find('footer > div').attributes('style')).toContain('--footer-columns: 5')

    provide('site-navigation', navigation({ footerColumns: [[menu('only', 'Only', [link('One', '/one')])]] }))
    await nextTick()

    expect(wrapper.find('footer > div').attributes('style')).toContain('--footer-columns: 4')
  })

  it('hides links a visitor is not meant to see, and a column that is empty for them', async () => {
    provide('site-navigation', navigation({
      footerColumns: [
        [menu('open', 'Open', [link('Everyone', '/everyone'), link('Members', '/members', { visibility: 'auth' })])],
        [menu('private', 'Private', [link('Secret', '/secret', { visibility: 'auth' })])],
      ],
    }))
    const wrapper = await mountSuspended(AppFooter, { global: { stubs } })

    expect(wrapper.find('a[href="/everyone"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/members"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Private')
  })

  it('fills the copyright template with the year and the site name, else uses the built-in line', async () => {
    provide('site-navigation', navigation())
    provide('site-settings', { siteName: 'Acme', footerCopyright: '© {year} {siteName} - all yours', footerTaglineSecondary: 'Built with care' })
    const custom = await mountSuspended(AppFooter, { global: { stubs } })

    expect(custom.text()).toContain(`© ${new Date().getFullYear()} Acme - all yours`)
    expect(custom.text()).toContain('Built with care')

    provide('site-settings', { siteName: 'Acme', footerCopyright: null, footerTaglineSecondary: null })
    const builtIn = await mountSuspended(AppFooter, { global: { stubs } })

    expect(builtIn.text()).toContain('All rights reserved.')
    expect(builtIn.text()).toContain('Made for people who get things done.')
  })

  it('falls back to the built-in links when the navigation could not be loaded', async () => {
    provide('site-navigation', undefined)
    const wrapper = await mountSuspended(AppFooter, { global: { stubs } })

    expect(wrapper.text()).toContain('For customers')
    expect(wrapper.find('a[href="/browse"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/become-a-provider"]').exists()).toBe(true)
  })

  it('shows nothing under a social heading when there are none', async () => {
    provide('site-navigation', navigation({ social: [] }))
    const wrapper = await mountSuspended(AppFooter, { global: { stubs } })

    expect(wrapper.find('a[aria-label="Facebook"]').exists()).toBe(false)
  })
})

describe('AppFooterCompact', () => {
  afterEach(() => provide('site-navigation', undefined))

  it('shows the page lists and the bottom links, but not the desktop-only columns', async () => {
    provide('site-navigation', navigation())
    const wrapper = await mountSuspended(AppFooterCompact)

    expect(wrapper.find('a[href="/legal/terms"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/sitemap"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/browse"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/ph/cebu"]').exists()).toBe(false)
  })

  it('shows the social links', async () => {
    provide('site-navigation', navigation())
    const wrapper = await mountSuspended(AppFooterCompact)

    expect(wrapper.find('a[aria-label="YouTube"]').attributes('href')).toBe('https://youtube.com/pf')
  })
})

describe('AppHeader', () => {
  afterEach(() => provide('site-navigation', undefined))

  it('renders the admin\'s header links, minus the ones this visitor should not see', async () => {
    provide('site-navigation', navigation())
    const wrapper = await mountSuspended(AppHeader, { global: { stubs } })

    const links = wrapper.findAll('nav > ul a').map(a => [a.text(), a.attributes('href')])
    // A guest: no "members only" link, and the "everyone except providers" one is there.
    expect(links).toEqual([['How it works', '/#how-it-works'], ['Browse', '/browse'], ['Become a pro', '/become-a-provider']])
  })

  it('falls back to the built-in links when the navigation could not be loaded', async () => {
    provide('site-navigation', undefined)
    const wrapper = await mountSuspended(AppHeader, { global: { stubs } })

    expect(wrapper.findAll('nav > ul a').map(a => a.attributes('href'))).toEqual(['/#how-it-works', '/browse', '/jobs', '/blog', '/become-a-provider'])
  })
})
