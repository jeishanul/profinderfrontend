export const SEO_SORTS = ['recommended', 'rating', 'reviews', 'price_asc', 'price_desc', 'newest'] as const
export type SeoSort = (typeof SEO_SORTS)[number]

function readQuery(query: Record<string, unknown>) {
  const sort = String(query.sort)
  return {
    page: Math.max(1, Number(query.page) || 1),
    sort: (SEO_SORTS as readonly string[]).includes(sort) ? (sort as SeoSort) : 'recommended' as SeoSort,
    q: typeof query.q === 'string' ? query.q : '',
  }
}

/**
 * Search, sort and page state for a landing page's provider list. The URL is the source of truth: changing a filter
 * replaces the query string, and the browser's back/forward buttons put the filters back.
 */
export function useSeoProviderFilters(perPage = 8) {
  const route = useRoute()
  const router = useRouter()

  const initial = readQuery(route.query)
  const currentPage = ref(initial.page)
  const currentSort = ref<SeoSort>(initial.sort)
  const searchInput = ref(initial.q)
  const searchQuery = ref(initial.q)

  const commitSearch = useDebounceFn((value: string) => {
    searchQuery.value = value.trim()
  }, 300)
  watch(searchInput, value => commitSearch(value))

  function updateQuery() {
    const query: Record<string, string> = {}
    if (currentPage.value > 1) query.page = String(currentPage.value)
    if (currentSort.value !== 'recommended') query.sort = currentSort.value
    if (searchQuery.value.trim()) query.q = searchQuery.value.trim()
    router.replace({ query })
  }

  // Set while a URL change (back/forward) is being copied into the refs, so it isn't mistaken for the person
  // changing a filter, which would bounce them to page 1.
  let applyingRoute = false

  watch([currentSort, searchQuery], () => {
    if (applyingRoute) return
    currentPage.value = 1
    updateQuery()
  })

  watch(() => route.query, (query) => {
    const next = readQuery(query)
    if (next.page === currentPage.value && next.sort === currentSort.value && next.q === searchQuery.value) return
    applyingRoute = true
    currentPage.value = next.page
    currentSort.value = next.sort
    searchInput.value = next.q
    searchQuery.value = next.q
    nextTick(() => {
      applyingRoute = false
    })
  })

  const listQuery = computed(() => ({
    q: searchQuery.value.trim() || undefined,
    sort: currentSort.value !== 'recommended' ? currentSort.value : undefined,
    page: currentPage.value,
    perPage,
  }))

  function goToPage(page: number) {
    currentPage.value = page
    updateQuery()
    if (import.meta.client) window.scrollTo({ top: 200, behavior: 'smooth' })
  }

  return { currentPage, currentSort, searchInput, searchQuery, listQuery, goToPage }
}
