import type { NavigationData, NavViewer } from '#shared/types/navigation'

export const NAVIGATION_KEY = 'site-navigation'

/**
 * The header, footer and mobile-menu links from the admin CMS. Fetched once in `app.vue` (so it lands in the SSR
 * payload) and read from that shared cache everywhere else. If that request failed, the built-in links are used.
 * `viewer` says who is looking, for `visibleLinks` / `visibleMenus`.
 */
export function useNavigation() {
  const { data } = useNuxtData<NavigationData>(NAVIGATION_KEY)
  const { t } = useI18n()
  const { settings } = useSiteSettings()
  const session = useSession()

  const navigation = computed<NavigationData>(() => data.value ?? defaultNavigation(t, settings.value))
  const viewer = computed<NavViewer>(() => ({ isAuthenticated: session.isAuthenticated.value, isProvider: session.isProvider.value }))

  return { navigation, viewer }
}
