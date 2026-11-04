/**
 * The filter state behind a provider listing with the filter sidebar: `/browse`, and the category and sub-category
 * landing pages (`/category/{category}` and `/category/{category}/{skill}`). The URL query is the source of truth
 * (see `parseBrowseQuery`). On a landing page the category, and the sub-category, come from the path instead, so
 * they are never written to the query string.
 */
export function useBrowseFilters(options: { category?: string, skill?: string, perPage?: number } = {}) {
  const route = useRoute()
  const perPage = options.perPage ?? 6

  const filters = reactive<BrowseFilters>(parseBrowseQuery(route.query))

  // Set while a route change (a link that sets a filter and a page at once, back/forward) is copied in, so the
  // page-reset watcher below doesn't stomp on an explicit page from that same link.
  let applyingRouteChange = false

  // Search is debounced so typing doesn't refetch on every keystroke.
  const searchInput = ref(filters.q)
  const commitSearch = useDebounceFn((value: string) => {
    filters.q = value.trim()
  }, 300)
  watch(searchInput, value => commitSearch(value))

  watch(() => route.query, (query) => {
    applyingRouteChange = true
    Object.assign(filters, parseBrowseQuery(query))
    searchInput.value = filters.q
    nextTick(() => {
      applyingRouteChange = false
    })
  })

  // Any filter change other than the page itself starts again from page 1...
  watch(() => JSON.stringify({ ...filters, page: 0 }), () => {
    if (applyingRouteChange) return
    filters.page = 1
  })
  // ...and every change is reflected in the URL.
  watch(() => JSON.stringify(filters), () => {
    navigateTo({ path: route.path, query: toBrowseRouteQuery(filters) }, { replace: true })
  })

  const providerQuery = computed(() => toProviderApiQuery({
    ...filters,
    categories: options.category ? [options.category] : filters.categories,
    skills: options.skill ? [options.skill] : filters.skills,
  }, perPage))

  /** The filters a category link carries along: everything except the category, the sub-category and the page. */
  const carriedQuery = computed(() => toBrowseRouteQuery({ ...filters, categories: [], skills: [], page: 1 }))

  // Below `md`, filters live in a bottom sheet that edits a draft and only commits on "Apply", so changing a
  // checkbox behind a half-open sheet doesn't reshuffle the results under it.
  const filterSheetOpen = ref(false)
  const draft = reactive<BrowseFilters>(parseBrowseQuery({}))

  watch(filterSheetOpen, (open) => {
    if (open) Object.assign(draft, { ...filters, categories: [...filters.categories], skills: [...filters.skills] })
  })

  function applyDraft() {
    Object.assign(filters, { ...draft, q: filters.q, sort: filters.sort, page: 1 })
    filterSheetOpen.value = false
  }

  function resetDraft() {
    Object.assign(draft, parseBrowseQuery({}), { q: filters.q, sort: filters.sort })
  }

  function goToPage(page: number) {
    filters.page = page
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { filters, searchInput, providerQuery, carriedQuery, filterSheetOpen, draft, applyDraft, resetDraft, goToPage }
}
