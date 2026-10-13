/**
 * A page whose canonical URL isn't simply its own address (an admin-set override on a landing page) registers it here
 * and `app.vue` swaps it in for the site-wide one, so the page only ever emits a single `<link rel="canonical">`.
 * `owner` is the component that set it: during a client-side navigation the incoming page can set its value before
 * the outgoing one unmounts, and the outgoing page must not clear what the new one just wrote.
 */
export interface CanonicalOverride {
  owner: number
  url: string
}

export function useCanonicalOverride() {
  return useState<CanonicalOverride | null>('canonical-override', () => null)
}

export function useSetCanonicalOverride(url: string | null | undefined) {
  const override = useCanonicalOverride()
  const owner = getCurrentInstance()?.uid ?? 0

  if (url) override.value = { owner, url }

  onBeforeUnmount(() => {
    if (override.value?.owner === owner) override.value = null
  })
}
