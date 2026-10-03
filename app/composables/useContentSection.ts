import type { ContentItem } from '#shared/types/marketplace'

/**
 * The admin-managed items of one homepage section (`hero_slides`,
 * `trust_stats`, `how_it_works`, `why_choose_us`). An empty result — the
 * section has no active items, or the request failed — means "use the built-in
 * copy", so the page is never blank. Not awaited: `useApi` still registers for
 * SSR, so the server render includes the data without blocking this setup.
 */
export function useContentSection(section: string) {
  const { data } = useApi<ContentItem[]>(`/content/${section}`, {
    key: `content-${section}`,
    default: () => [],
  })

  return computed(() => data.value ?? [])
}
