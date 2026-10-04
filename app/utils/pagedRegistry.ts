type Refresher = () => Promise<unknown>

/**
 * Which paged lists are currently on screen, by their `useAsyncData` key. A
 * plain `refreshNuxtData(key)` re-runs only a list's first page, which drops
 * every page the person had loaded with "Load more"; the list's own
 * `refresh()` keeps them. Lists register that here so other components (the
 * booking drawer, the review form) can refresh them without knowing about them.
 */
export class PagedRefreshRegistry {
  private readonly refreshers = new Map<string, Set<Refresher>>()

  /** Returns the function that takes the list out again (call it when the component goes away). */
  register(key: string, refresher: Refresher): () => void {
    const set = this.refreshers.get(key) ?? new Set<Refresher>()
    set.add(refresher)
    this.refreshers.set(key, set)
    return () => {
      set.delete(refresher)
      if (set.size === 0) this.refreshers.delete(key)
    }
  }

  /** Refreshes registered paged lists in place; every other key goes to `fallback` (e.g. `refreshNuxtData`). */
  async refresh(keys: string[], fallback: (keys: string[]) => Promise<unknown>): Promise<void> {
    const plain: string[] = []
    const jobs: Promise<unknown>[] = []

    for (const key of keys) {
      const set = this.refreshers.get(key)
      if (set && set.size > 0) jobs.push(...[...set].map(refresher => refresher()))
      else plain.push(key)
    }

    if (plain.length > 0) jobs.push(fallback(plain))
    await Promise.all(jobs)
  }
}

/**
 * Lets a slow response find out it has been overtaken (the filter changed, or
 * the list was reloaded, while it was in flight) so it doesn't append stale rows.
 */
export function createLatestGuard() {
  let current = 0
  return {
    /** A new "generation": everything started before it is now stale. */
    bump: () => ++current,
    token: () => current,
    isStale: (token: number) => token !== current,
  }
}
