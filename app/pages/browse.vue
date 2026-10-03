<script setup lang="ts">
import type { PagedResult, ProviderSummary, ServiceCategory } from '#shared/types/marketplace'

const { t, locale } = useI18n()
const route = useRoute()

// With skills, so the sidebar can offer them once a single category is chosen.
const { data: categories } = await useApi<ServiceCategory[]>('/categories', {
  key: 'categories-with-skills',
  query: { include: 'skills' },
})

// Loaded once here (a page, safe for top-level await) so every
// <MarketplaceProviderCard/> below can read `isSaved` synchronously.
await useSavedProviders().ensureLoaded()

const SORTS = ['recommended', 'rating', 'reviews', 'price_asc', 'price_desc', 'newest'] as const
type Sort = (typeof SORTS)[number]

interface Filters {
  q: string
  sort: Sort
  categories: string[]
  skills: string[]
  availableDay: string | null
  province: string | null
  city: string | null
  barangay: string | null
  minRating: number
  verifiedOnly: boolean
  minPrice: number
  maxPrice: number
  page: number
}

const list = (value: unknown) => (typeof value === 'string' && value ? value.split(',').filter(Boolean) : [])
const text = (value: unknown) => (typeof value === 'string' && value ? value : null)

/** The URL is the source of truth: every filter lives in it, so links, back/forward and reloads all agree. */
function fromQuery(query: typeof route.query): Filters {
  const sort = text(query.sort) as Sort | null
  return {
    q: text(query.q) ?? '',
    sort: sort && SORTS.includes(sort) ? sort : 'recommended',
    categories: list(query.categories),
    skills: list(query.skills),
    availableDay: text(query.availableDay),
    province: text(query.province),
    city: text(query.city),
    barangay: text(query.barangay),
    minRating: query.minRating ? Number(query.minRating) : 0,
    verifiedOnly: query.verifiedOnly === 'true',
    minPrice: query.minPrice ? Number(query.minPrice) : PRICE_MIN,
    maxPrice: query.maxPrice ? Number(query.maxPrice) : PRICE_MAX,
    page: query.page ? Math.max(1, Number(query.page)) : 1,
  }
}

function toQuery(f: Filters) {
  return {
    ...(f.q ? { q: f.q } : {}),
    ...(f.sort !== 'recommended' ? { sort: f.sort } : {}),
    ...(f.categories.length > 0 ? { categories: f.categories.join(',') } : {}),
    ...(f.skills.length > 0 ? { skills: f.skills.join(',') } : {}),
    ...(f.availableDay ? { availableDay: f.availableDay } : {}),
    ...(f.province ? { province: f.province } : {}),
    ...(f.city ? { city: f.city } : {}),
    ...(f.barangay ? { barangay: f.barangay } : {}),
    ...(f.minRating ? { minRating: String(f.minRating) } : {}),
    ...(f.verifiedOnly ? { verifiedOnly: 'true' } : {}),
    ...(f.minPrice > PRICE_MIN ? { minPrice: String(f.minPrice) } : {}),
    ...(f.maxPrice < PRICE_MAX ? { maxPrice: String(f.maxPrice) } : {}),
    ...(f.page > 1 ? { page: String(f.page) } : {}),
  }
}

const filters = reactive<Filters>(fromQuery(route.query))

// Set while `fromQuery` is applying an external route change (a link that
// sets a filter AND a page at once, back/forward, a footer category link) so
// the page-reset watcher below doesn't stomp on an explicit page from that
// same link — it previously always won, landing every such link on page 1.
let applyingRouteChange = false

// A link followed while already on /browse (footer category, back/forward)
// changes the URL but not this component — pull the change in.
watch(() => route.query, (query) => {
  applyingRouteChange = true
  Object.assign(filters, fromQuery(query))
  searchInput.value = filters.q
  nextTick(() => {
    applyingRouteChange = false
  })
})

// Any filter change other than the page itself starts again from page 1.
watch(() => JSON.stringify({ ...filters, page: 0 }), () => {
  if (applyingRouteChange) return
  filters.page = 1
})
// ...and every change is reflected in the URL.
watch(() => JSON.stringify(filters), () => {
  navigateTo({ path: route.path, query: toQuery(filters) }, { replace: true })
})

// Search is debounced so typing doesn't refetch on every keystroke.
const searchInput = ref(filters.q)
const commitSearch = useDebounceFn((value: string) => {
  filters.q = value.trim()
}, 300)
watch(searchInput, value => commitSearch(value))

const activeCategories = computed<ServiceCategory[]>(
  () => (categories.value ?? []).filter(category => filters.categories.includes(category.id)),
)

const providerQuery = computed(() => ({
  q: filters.q || undefined,
  sort: filters.sort !== 'recommended' ? filters.sort : undefined,
  categories: filters.categories.length > 0 ? filters.categories.join(',') : undefined,
  skills: filters.skills.length > 0 ? filters.skills.join(',') : undefined,
  availableDay: filters.availableDay ?? undefined,
  province: filters.province ?? undefined,
  city: filters.city ?? undefined,
  barangay: filters.barangay ?? undefined,
  minRating: filters.minRating || undefined,
  verifiedOnly: filters.verifiedOnly || undefined,
  minRate: filters.minPrice > PRICE_MIN ? filters.minPrice : undefined,
  maxRate: filters.maxPrice < PRICE_MAX ? filters.maxPrice : undefined,
  page: filters.page,
  perPage: 6,
}))

const { data: providersPage } = await useApi<PagedResult<ProviderSummary>>('/providers', {
  query: providerQuery,
  key: 'browse-providers',
})

// Resolved just for the page title's "near {location}" text — the filter
// sidebar's own <UiLocationPicker> resolves names internally for its own
// display, this is a separate lookup for this page-level string.
const { data: allProvinces } = await useApi<{ code: string, name: string }[]>('/locations/provinces', {
  key: 'ph-provinces',
  default: () => [],
})
const { data: citiesInProvince } = useApi<{ code: string, name: string }[]>('/locations/cities', {
  key: 'ph-cities-browse-title',
  query: computed(() => ({ province: filters.province ?? undefined })),
  default: () => [],
})
const locationTitle = computed(() => {
  if (filters.barangay) return filters.barangay
  if (filters.city) return citiesInProvince.value?.find(c => c.code === filters.city)?.name ?? t('marketplace.browse.anywhere')
  if (filters.province) return allProvinces.value?.find(p => p.code === filters.province)?.name ?? t('marketplace.browse.anywhere')
  return t('marketplace.browse.anywhere')
})

// Remembers the province for the homepage's "Featured" section (see `useLastSearch`).
const lastSearch = useLastSearch()
watch(() => filters.province, (province) => {
  lastSearch.value = province ? { provinceCode: province } : null
}, { immediate: true })

// Below `md`, filters live in a bottom sheet instead of a sidebar. The sheet
// edits a *draft* copy and only commits on "Apply" — changing a checkbox
// behind a half-open sheet shouldn't reshuffle the results under it. (The
// desktop sidebar edits `filters` directly and applies live.)
const filterSheetOpen = ref(false)
const draft = reactive<Filters>(fromQuery({}))

watch(filterSheetOpen, (open) => {
  if (open) Object.assign(draft, { ...filters, categories: [...filters.categories], skills: [...filters.skills] })
})

function applyDraft() {
  Object.assign(filters, { ...draft, q: filters.q, sort: filters.sort, page: 1 })
  filterSheetOpen.value = false
}

function resetDraft() {
  Object.assign(draft, fromQuery({}), { q: filters.q, sort: filters.sort })
}

const pages = computed(() => pageNumbers(providersPage.value?.page ?? 1, providersPage.value?.totalPages ?? 1))

function goToPage(page: number) {
  filters.page = page
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const categoryLabelList = computed(() => activeCategories.value.map(category => category.name))

const pageTitle = computed(() => categoryLabelList.value.length > 0
  ? t('marketplace.browse.titleWithCategory', {
      count: providersPage.value?.total ?? 0,
      category: new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(categoryLabelList.value),
      location: locationTitle.value,
    })
  : t('marketplace.browse.titleAll', {
      count: providersPage.value?.total ?? 0,
      location: locationTitle.value,
    }))

useSeoMeta({
  title: pageTitle,
  description: t('marketplace.browse.seoDescription'),
})
defineOgImage('MarketplaceSatori', {
  title: pageTitle,
  eyebrow: t('marketplace.browse.seoEyebrow'),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
    <div class="flex items-center justify-between gap-3">
      <h1 class="font-display text-2xl font-bold sm:text-3xl">
        {{ pageTitle }}
      </h1>
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-bold md:hidden dark:border-white/10"
        @click="filterSheetOpen = true"
      >
        <UiIcon
          name="sliders"
          :size="15"
        />
        {{ t('marketplace.filters.heading') }}
      </button>
    </div>

    <div class="mt-8 grid gap-7 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
      <!-- This wrapper is the grid cell and stretches to the row's full
           height (matching the results column); the sidebar itself is the
           `sticky` element inside it, so it has room to travel and pin all
           the way down a tall results list instead of stopping early.
           Hidden below `md` (phones only) — tablet has the width for the
           real sidebar (narrower than desktop's, widening again at `lg`),
           so only phones fall back to the bottom sheet (`UiBottomSheet`
           below); tablet never sees a full-width inline sidebar-less list. -->
      <div class="hidden md:block">
        <MarketplaceProviderFilterSidebar
          v-model:category-ids="filters.categories"
          v-model:province="filters.province"
          v-model:city="filters.city"
          v-model:barangay="filters.barangay"
          v-model:min-rating="filters.minRating"
          v-model:verified-only="filters.verifiedOnly"
          v-model:min-price="filters.minPrice"
          v-model:max-price="filters.maxPrice"
          v-model:skill-ids="filters.skills"
          v-model:available-day="filters.availableDay"
          :categories="categories ?? []"
          :show-apply="false"
          class="sticky top-28"
        />
      </div>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-3 sm:flex-row">
          <UiInput
            v-model="searchInput"
            icon="search"
            class="flex-1"
            :placeholder="t('marketplace.browse.searchPlaceholder')"
            :aria-label="t('marketplace.browse.searchPlaceholder')"
          />
          <select
            v-model="filters.sort"
            :aria-label="t('marketplace.browse.sortLabel')"
            class="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option
              v-for="option in SORTS"
              :key="option"
              :value="option"
            >
              {{ t(`marketplace.browse.sort.${option}`) }}
            </option>
          </select>
        </div>

        <template v-if="providersPage && providersPage.items.length">
          <MarketplaceProviderCard
            v-for="provider in providersPage.items"
            :key="provider.id"
            :provider="provider"
            variant="row"
          />
        </template>
        <p
          v-else
          class="rounded-2xl border border-black/10 bg-white/70 p-8 text-center text-black/60 dark:border-white/10 dark:bg-black/30 dark:text-white/60"
        >
          {{ t('marketplace.browse.noResults') }}
        </p>

        <nav
          v-if="providersPage && providersPage.totalPages > 1"
          class="mt-2 flex items-center justify-center gap-1.5"
          :aria-label="t('marketplace.browse.pagination')"
        >
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 disabled:opacity-40 dark:border-white/10"
            :disabled="filters.page <= 1"
            :aria-label="t('marketplace.browse.previousPage')"
            @click="goToPage(filters.page - 1)"
          >
            <UiIcon
              name="arrow-right"
              class="rotate-180"
              :size="15"
            />
          </button>
          <template
            v-for="(entry, index) in pages"
            :key="entry ?? `gap-${index}`"
          >
            <span
              v-if="entry === null"
              class="px-1 text-black/40 dark:text-white/40"
              aria-hidden="true"
            >…</span>
            <button
              v-else
              type="button"
              class="h-10 min-w-10 rounded-full px-3 text-sm font-bold transition-colors"
              :class="entry === providersPage.page ? 'bg-brand-600 text-white' : 'border border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10'"
              :aria-current="entry === providersPage.page ? 'page' : undefined"
              @click="goToPage(entry)"
            >
              {{ entry }}
            </button>
          </template>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 disabled:opacity-40 dark:border-white/10"
            :disabled="filters.page >= providersPage.totalPages"
            :aria-label="t('marketplace.browse.nextPage')"
            @click="goToPage(filters.page + 1)"
          >
            <UiIcon
              name="arrow-right"
              :size="15"
            />
          </button>
        </nav>
      </div>
    </div>

    <UiBottomSheet
      :open="filterSheetOpen"
      labelledby="browse-filter-sheet-heading"
      @close="filterSheetOpen = false"
    >
      <div class="px-5 pb-6">
        <h2
          id="browse-filter-sheet-heading"
          class="sr-only"
        >
          {{ t('marketplace.filters.heading') }}
        </h2>
        <MarketplaceProviderFilterSidebar
          v-model:category-ids="draft.categories"
          v-model:province="draft.province"
          v-model:city="draft.city"
          v-model:barangay="draft.barangay"
          v-model:min-rating="draft.minRating"
          v-model:verified-only="draft.verifiedOnly"
          v-model:min-price="draft.minPrice"
          v-model:max-price="draft.maxPrice"
          v-model:skill-ids="draft.skills"
          v-model:available-day="draft.availableDay"
          :categories="categories ?? []"
          id-prefix="browse-filter-sheet"
          bare
          @apply="applyDraft"
          @reset="resetDraft"
        />
      </div>
    </UiBottomSheet>
  </div>
</template>
