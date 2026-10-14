import type { NavigationData, NavLink, NavMenu, NavViewer, SocialLink } from '#shared/types/navigation'
import type { SiteSettings } from '#shared/types/marketplace'

type Translate = (key: string) => string

/**
 * The links the site had before the CMS: used when `/api/navigation` can't be reached, so the header and footer still
 * work. Only the fixed links: the lists the backend builds (pages, categories, places) need the API anyway.
 */
export function defaultNavigation(t: Translate, settings?: Pick<SiteSettings, 'social'>): NavigationData {
  const link = (label: string, url: string, visibility: NavLink['visibility'] = 'all'): NavLink => ({ label, url, newTab: false, visibility, icon: null })
  const menu = (key: string, title: string, items: NavLink[]): NavMenu => ({ key, title, source: 'manual', items })

  const social: SocialLink[] = []
  for (const [network, label] of [['facebook', 'Facebook'], ['x', 'X'], ['instagram', 'Instagram']] as const) {
    const url = settings?.social[network]
    if (url) social.push({ network, label, url })
  }

  return {
    header: [
      link(t('nav.howItWorks'), '/#how-it-works'),
      link(t('nav.browseServices'), '/browse'),
      link(t('nav.becomeProvider'), '/become-a-provider', 'non_provider'),
    ],
    footerColumns: [[
      menu('footer_customers', t('footer.customers.heading'), [link(t('footer.customers.browseServices'), '/browse'), link(t('footer.customers.howItWorks'), '/#how-it-works')]),
      menu('footer_providers', t('footer.providers.heading'), [link(t('footer.providers.becomeProvider'), '/become-a-provider')]),
    ]],
    footerRows: [],
    footerBottom: [],
    mobileMore: { title: null, items: [] },
    social,
  }
}

/** Whether this visitor should see a link. */
export function isLinkVisible(link: Pick<NavLink, 'visibility'>, viewer: NavViewer): boolean {
  switch (link.visibility) {
    case 'guest': return !viewer.isAuthenticated
    case 'auth': return viewer.isAuthenticated
    case 'non_provider': return !viewer.isProvider
    default: return true
  }
}

export function visibleLinks(links: NavLink[], viewer: NavViewer): NavLink[] {
  return links.filter(link => isLinkVisible(link, viewer))
}

/** The menus that still have a link for this visitor (a heading over nothing is dropped). */
export function visibleMenus(menus: NavMenu[], viewer: NavViewer): NavMenu[] {
  return menus
    .map(menu => ({ ...menu, items: visibleLinks(menu.items, viewer) }))
    .filter(menu => menu.items.length > 0)
}

/** Columns of stacked menus, minus the menus and columns left empty for this visitor. */
export function visibleColumns(columns: NavMenu[][], viewer: NavViewer): NavMenu[][] {
  return columns.map(menus => visibleMenus(menus, viewer)).filter(menus => menus.length > 0)
}

/** The footer on a phone is one row of links: the bottom links plus the page lists (legal pages and the like). */
export function compactFooterLinks(navigation: NavigationData, viewer: NavViewer): NavLink[] {
  const pageLists = navigation.footerColumns.flat().filter(menu => menu.source === 'pages').flatMap(menu => menu.items)
  return visibleLinks([...pageLists, ...navigation.footerBottom], viewer)
}

/** The icon for a social network; networks without a drawing (and `website`) get the globe. */
export function socialIconName(network: string): IconName {
  return network === 'website' ? 'globe' : knownIcon(network, 'globe')
}

/** Only Facebook's mark is a solid glyph; the others are outlines. */
export function socialIconFilled(network: string): boolean {
  return network === 'facebook'
}

/** The footer copyright line from the admin's template (`{year}` and `{siteName}` are filled in). */
export function formatFooterText(template: string, vars: { year: number, siteName: string }): string {
  return template.replaceAll('{year}', String(vars.year)).replaceAll('{siteName}', vars.siteName)
}
