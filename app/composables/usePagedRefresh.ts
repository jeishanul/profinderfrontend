import { PagedRefreshRegistry } from '~/utils/pagedRegistry'

// One registry per Nuxt app instance (never module-level state: that would leak across SSR requests).
const registries = new WeakMap<object, PagedRefreshRegistry>()

export function usePagedRefreshRegistry(): PagedRefreshRegistry {
  const app = useNuxtApp()
  let registry = registries.get(app)
  if (!registry) {
    registry = new PagedRefreshRegistry()
    registries.set(app, registry)
  }
  return registry
}

/**
 * Refreshes everything a booking change can make stale. Paged lists refresh
 * in place (keeping the pages already loaded); the rest go through
 * `refreshNuxtData`. Call this instead of `refreshNuxtData(BOOKING_DATA_KEYS)`.
 */
export function useRefreshBookingLists() {
  const registry = usePagedRefreshRegistry()
  return (extraKeys: string[] = []) => registry.refresh([...BOOKING_DATA_KEYS, ...extraKeys], keys => refreshNuxtData(keys))
}
