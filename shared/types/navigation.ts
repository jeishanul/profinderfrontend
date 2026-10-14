/**
 * The header, footer and mobile menu from the admin CMS (`/api/navigation` -> Laravel `/v1/navigation`). Addresses are
 * already resolved (a link to a page, category or home-page section arrives as its final path). If the request fails
 * the site falls back to its built-in links, see `app/utils/navigation.ts`.
 */

/** Who sees a link. Decided in the browser, because the payload is cached and shared between visitors. */
export type NavVisibility = 'all' | 'guest' | 'auth' | 'non_provider'

export interface NavLink {
  label: string
  /** A site path (`/browse`, `/#faq`), a web address, `mailto:` or `tel:`. */
  url: string
  newTab: boolean
  visibility: NavVisibility
  icon: string | null
}

export interface NavMenu {
  key: string
  title: string | null
  /** `manual` for the admin's own links; otherwise a list the site builds (`categories`, `pages`, `locations`). */
  source: string
  items: NavLink[]
}

export interface SocialLink {
  /** Also the icon name (`facebook`, `youtube`, ...). */
  network: string
  label: string
  url: string
}

export interface NavigationData {
  header: NavLink[]
  /** Each column holds one or more menus stacked under each other. */
  footerColumns: NavMenu[][]
  /** Horizontal link rows under the columns (e.g. popular locations). */
  footerRows: NavMenu[]
  footerBottom: NavLink[]
  mobileMore: { title: string | null, items: NavLink[] }
  social: SocialLink[]
}

/** Who is looking at the page, for `NavLink.visibility`. */
export interface NavViewer {
  isAuthenticated: boolean
  isProvider: boolean
}
