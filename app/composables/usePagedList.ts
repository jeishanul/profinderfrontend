import type { ListPageMeta, Paged } from '#shared/types/dashboard'
import { createLatestGuard } from '~/utils/pagedRegistry'

interface PagedListOptions {
  /** Unique `useAsyncData` key. */
  key: string
  /** Filters sent with every page (search, status, …). A change refetches from page 1. */
  query?: MaybeRefOrGetter<Record<string, unknown>>
  perPage?: number
  /** Fetch only on the client, only when asked (`execute()`), like `useApi`'s own flags. */
  lazy?: boolean
  server?: boolean
  immediate?: boolean
}

/**
 * A server-paged list with "Load more": the first page goes through `useApi`
 * (SSR-friendly, refetches when `query` changes), later pages are appended
 * client-side. Works both as `await usePagedList(...)` and without the await.
 */
export function usePagedList<T extends { id: string }, M extends ListPageMeta = ListPageMeta>(url: string, options: PagedListOptions) {
  const perPage = options.perPage ?? 20
  const firstPageQuery = computed(() => ({ ...toValue(options.query), perPage, page: 1 }))

  const request = useApi<Paged<T, M> | null>(url, {
    key: options.key,
    query: firstPageQuery,
    lazy: options.lazy,
    server: options.server,
    immediate: options.immediate,
    default: () => null,
  })

  const later = shallowRef<T[]>([])
  const laterMeta = shallowRef<M | null>(null)
  const nextPage = ref(2)
  const loadingMore = ref(false)
  const loadMoreFailed = ref(false)

  // A response that arrives after the list was reset (filter change, reload) must not be appended to it.
  const guard = createLatestGuard()

  // A new first page (filter change) replaces whatever was appended.
  watch(request.data, () => {
    guard.bump()
    later.value = []
    laterMeta.value = null
    nextPage.value = 2
  }, { flush: 'sync' })

  const items = computed<T[]>(() => appendUnique(request.data.value?.data ?? [], later.value))
  const meta = computed<M | null>(() => laterMeta.value ?? request.data.value?.meta ?? null)
  const hasMore = computed(() => meta.value?.hasMore ?? false)

  async function fetchPage(page: number) {
    const token = guard.token()
    const result = await $fetch<Paged<T, M>>(`/api${url}`, { query: { ...toValue(options.query), perPage, page } })
    if (guard.isStale(token)) return
    later.value = appendUnique(later.value, result.data)
    laterMeta.value = result.meta
    nextPage.value = page + 1
  }

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    loadMoreFailed.value = false
    try {
      await fetchPage(nextPage.value)
    }
    catch {
      loadMoreFailed.value = true
    }
    finally {
      loadingMore.value = false
    }
  }

  /** Re-reads the list (polling, after an action) and keeps as many pages open as were loaded. */
  async function refresh() {
    const loadedPages = nextPage.value - 1
    await request.refresh()
    try {
      for (let page = 2; page <= loadedPages && hasMore.value; page++) await fetchPage(page)
    }
    catch {
      loadMoreFailed.value = true
    }
  }

  const result = {
    items,
    meta,
    hasMore,
    loadMore,
    loadingMore,
    loadMoreFailed,
    status: request.status,
    pending: computed(() => request.status.value === 'pending'),
    refresh,
    execute: request.execute,
  }

  // Lets other components (booking drawer, review form) refresh this list in place, keeping its loaded pages.
  if (import.meta.client) {
    const unregister = usePagedRefreshRegistry().register(options.key, refresh)
    if (getCurrentScope()) onScopeDispose(unregister)
  }

  // `then` resolves to a plain object (no `then` of its own), so awaiting can't loop.
  return Object.assign(request.then(() => result), result)
}
