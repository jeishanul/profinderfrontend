import type { SiteSettings } from '#shared/types/marketplace'

export const SITE_SETTINGS_KEY = 'site-settings'

/** What renders if the settings request fails — the site must still work. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'ProFinder',
  siteTagline: null,
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  contactEmail: null,
  contactPhone: null,
  supportHours: null,
  social: { facebook: null, x: null, instagram: null },
  defaultLocale: 'en',
  defaultCurrency: 'PHP',
  seoDefaultTitle: null,
  seoDefaultDescription: null,
  appStoreUrl: null,
  playStoreUrl: null,
  maintenanceMode: false,
}

/**
 * The admin-managed site settings (contact details, social links, branding,
 * currency…). Fetched once in `app.vue` (so it lands in the SSR payload) and
 * read from that shared cache everywhere else — calling this in a component
 * never triggers a second request.
 */
export function useSiteSettings() {
  const { data } = useNuxtData<SiteSettings>(SITE_SETTINGS_KEY)
  const { locale } = useI18n()

  const settings = computed<SiteSettings>(() => ({ ...DEFAULT_SITE_SETTINGS, ...(data.value ?? {}) }))

  /** An amount in the platform currency, e.g. `money(1500)` → "₱1,500". */
  const money = (amount: number) => formatMoney(amount, settings.value.defaultCurrency, locale.value)

  /** Just the symbol, for number inputs that show a prefix. */
  const symbol = computed(() => currencySymbol(settings.value.defaultCurrency, locale.value))

  return { settings, money, symbol }
}
