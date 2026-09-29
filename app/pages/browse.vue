<script setup lang="ts">
import type { PagedResult, ProviderProfile, ServiceCategory } from '#shared/types/marketplace'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const { data: categories } = await useApi<ServiceCategory[]>('/categories')

// Loaded once here (a page, safe for top-level await) so every
// <MarketplaceProviderCard/> below can read `isSaved` synchronously.
await useSavedProviders().ensureLoaded()

function parseCategoryIds(value: unknown): string[] {
  return typeof value === 'string' && value ? value.split(',').filter(Boolean) : []
}

// The top search bar (service + location) was removed from this page — it
// duplicated the landing page's hero search and, per the request, filtering
// happens through the sidebar only now. Service selection here is
// multi-select (see `MarketplaceProviderFilterSidebar`).
const filters = reactive({
  categories: parseCategoryIds(route.query.categories),
  province: typeof route.query.province === 'string' ? route.query.province : null as string | null,
  city: typeof route.query.city === 'string' ? route.query.city : null as string | null,
  barangay: typeof route.query.barangay === 'string' ? route.query.barangay : null as string | null,
  minRating: route.query.minRating ? Number(route.query.minRating) : 0,
  verifiedOnly: route.query.verifiedOnly === 'true',
  minPrice: route.query.minPrice ? Number(route.query.minPrice) : PRICE_MIN,
  maxPrice: route.query.maxPrice ? Number(route.query.maxPrice) : PRICE_MAX,
  page: route.query.page ? Number(route.query.page) : 1,
})

const activeCategories = computed<ServiceCategory[]>(
  () => (categories.value ?? []).filter(category => filters.categories.includes(category.id)),
)

const providerQuery = computed(() => ({
  categories: filters.categories.length > 0 ? filters.categories : undefined,
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

const { data: providersPage } = await useApi<PagedResult<ProviderProfile>>('/providers', {
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

function syncUrl() {
  navigateTo(localePath({
    path: '/browse',
    query: {
      ...(filters.categories.length > 0 ? { categories: filters.categories.join(',') } : {}),
      ...(filters.province ? { province: filters.province } : {}),
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.barangay ? { barangay: filters.barangay } : {}),
      ...(filters.minRating ? { minRating: String(filters.minRating) } : {}),
      ...(filters.verifiedOnly ? { verifiedOnly: 'true' } : {}),
      ...(filters.minPrice > PRICE_MIN ? { minPrice: String(filters.minPrice) } : {}),
      ...(filters.maxPrice < PRICE_MAX ? { maxPrice: String(filters.maxPrice) } : {}),
      ...(filters.page > 1 ? { page: String(filters.page) } : {}),
    },
  }), { replace: true })
}

// Below `lg` (where the sidebar collapses to full-width-if-shown), filters
// live in a bottom sheet instead — the 2026 mobile pattern (see CLAUDE.md's
// native-feel redesign notes): a desktop sidebar never ports to a native app.
const filterSheetOpen = ref(false)

function applyFilters() {
  filters.page = 1
  filterSheetOpen.value = false
  syncUrl()
}

function handleReset() {
  filters.page = 1
  syncUrl()
}

function goToPage(page: number) {
  filters.page = page
  syncUrl()
}

const categoryLabelList = computed(() => activeCategories.value.map(category => t(`marketplace.categories.${category.id}.label`)))

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
          :categories="categories ?? []"
          class="sticky top-28"
          @apply="applyFilters"
          @reset="handleReset"
        />
      </div>

      <div class="flex flex-col gap-4">
        <template v-if="providersPage && providersPage.items.length">
          <MarketplaceProviderCard
            v-for="provider in providersPage.items"
            :key="provider.id"
            :provider="provider"
            :category-icon="getCategoryIcon(categories ?? [], provider.categoryId)"
            variant="row"
          />
        </template>
        <p
          v-else
          class="rounded-2xl border border-black/10 bg-white/70 p-8 text-center text-black/60 dark:border-white/10 dark:bg-black/30 dark:text-white/60"
        >
          {{ t('marketplace.browse.noResults') }}
        </p>

        <div
          v-if="providersPage && providersPage.totalPages > 1"
          class="mt-2 flex items-center justify-center gap-2"
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
          <span class="px-3 text-sm text-black/60 dark:text-white/60">
            {{ t('marketplace.browse.pageOf', { page: providersPage.page, totalPages: providersPage.totalPages }) }}
          </span>
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
        </div>
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
          v-model:category-ids="filters.categories"
          v-model:province="filters.province"
          v-model:city="filters.city"
          v-model:barangay="filters.barangay"
          v-model:min-rating="filters.minRating"
          v-model:verified-only="filters.verifiedOnly"
          v-model:min-price="filters.minPrice"
          v-model:max-price="filters.maxPrice"
          :categories="categories ?? []"
          id-prefix="browse-filter-sheet"
          bare
          @apply="applyFilters"
          @reset="handleReset"
        />
      </div>
    </UiBottomSheet>
  </div>
</template>
