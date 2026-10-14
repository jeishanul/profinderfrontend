import type { HomeData } from '#shared/types/cms'

/**
 * The landing page's layout from the admin CMS. Awaited: it decides which sections exist and in what order, so it
 * belongs in the SSR payload (no flash of the default layout). If the request fails the page renders the default
 * layout with built-in copy — see `resolveHomeSections`.
 */
export async function useHomeSections() {
  const { data } = await useApi<HomeData>('/home', { key: 'home-sections' })

  return {
    sections: computed(() => resolveHomeSections(data.value)),
    heroBadge: computed(() => data.value?.heroBadge ?? null),
  }
}
