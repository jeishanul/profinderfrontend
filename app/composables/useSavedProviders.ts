/**
 * Shared "is this provider saved" state for the heart/save toggle wherever a
 * provider appears (browse results, provider profile) — backed by the real
 * `/dashboard/saved-providers` endpoints (only the ids are loaded here; the
 * saved-providers page pages through the full rows). `useState` so every card on a page
 * agrees after one toggle, without each card fetching the list itself.
 */
export function useSavedProviders() {
  const savedIds = useState<string[]>('saved-provider-ids', () => [])
  const loaded = useState<boolean>('saved-provider-ids-loaded', () => false)
  const session = useSession()

  async function ensureLoaded() {
    if (loaded.value || !session.isAuthenticated.value) return
    // `useRequestFetch()`, not `$fetch`/`useApiFetch` — this can run during
    // SSR (called with a top-level `await` from page setup), where a bare
    // `$fetch` to our own `/api/*` route doesn't forward the incoming
    // request's cookies (see `useSession.fetchUser`'s comment for the full
    // explanation) and `useApiFetch`'s CSRF wrapper crashes outside a
    // synchronous setup call. It's also a GET, so CSRF isn't needed anyway.
    try {
      savedIds.value = await useRequestFetch()<string[]>('/api/dashboard/saved-providers/ids')
      loaded.value = true
    }
    catch {
      // A hiccup loading the hearts must never take the whole page down with it; they just show empty
      // until the next attempt (`loaded` stays false).
    }
  }

  /** Forget what was loaded — the person behind the session may have changed. */
  function reset() {
    savedIds.value = []
    loaded.value = false
  }

  function isSaved(providerId: string): boolean {
    return savedIds.value.includes(providerId)
  }

  async function save(providerId: string) {
    await useApiFetch(`/api/dashboard/saved-providers/${providerId}`, { method: 'POST' })
    if (!isSaved(providerId)) savedIds.value = [...savedIds.value, providerId]
  }

  async function unsave(providerId: string) {
    await useApiFetch(`/api/dashboard/saved-providers/${providerId}`, { method: 'DELETE' })
    savedIds.value = savedIds.value.filter(id => id !== providerId)
  }

  async function toggle(providerId: string) {
    if (isSaved(providerId)) await unsave(providerId)
    else await save(providerId)
  }

  return { ensureLoaded, reset, isSaved, toggle, save, unsave }
}
