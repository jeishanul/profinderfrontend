<script setup lang="ts">
import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

const { t } = useI18n()

// The page's requests are started without awaiting each one, then awaited together below: none depends on another,
// and one awaited on its own would add a full round trip to every render.
// With skills, so the sidebar can nest them under a category.
const categoriesRequest = useCategories({ withSkills: true })
const { data: categories } = categoriesRequest

// The hearts on every <MarketplaceProviderCard/> below: personal, so filled in after mount.
useSavedProviders().loadAfterMount()

const { filters, searchInput, providerQuery, carriedQuery, filterSheetOpen, draft, applyDraft, resetDraft, goToPage } = useBrowseFilters({ perPage: 6 })

// Every provider, any category: picking a category in the sidebar opens its own page (/category/{slug}), and an older
// `/browse?categories=` link is sent there by the `seo-redirects` middleware before this page renders.

const providersRequest = useApi<PagedResult<ProviderSummary>>('/providers', {
  query: providerQuery,
  key: 'browse-providers',
})
const { data: providersPage } = providersRequest

// Resolved just for the page title's "near {location}" text — the filter
// sidebar's own <UiLocationPicker> resolves names internally for its own
// display, this is a separate lookup for this page-level string.
const provincesRequest = useApi<{ code: string, name: string, slug?: string }[]>('/locations/provinces', {
  key: 'ph-provinces',
  default: () => [],
})
const { data: allProvinces } = provincesRequest
const { data: citiesInProvince } = useApi<{ code: string, name: string, slug?: string }[]>('/locations/cities', {
  key: 'ph-cities-browse-title',
  query: computed(() => ({ province: filters.province ?? undefined })),
  default: () => [],
})
const locationTitle = computed(() => {
  if (filters.barangay) return filters.barangay
  if (filters.city) return citiesInProvince.value?.find(c => c.code === filters.city || (c.slug && c.slug === filters.city))?.name ?? t('marketplace.browse.anywhere')
  if (filters.province) return allProvinces.value?.find(p => p.code === filters.province || (p.slug && p.slug === filters.province))?.name ?? t('marketplace.browse.anywhere')
  return t('marketplace.browse.anywhere')
})

await Promise.all([categoriesRequest, providersRequest, provincesRequest])

// Remembers the province for the homepage's "Featured" section (see `useLastSearch`).
const lastSearch = useLastSearch()
watch(() => filters.province, (province) => {
  lastSearch.value = province ? { provinceCode: province } : null
}, { immediate: true })

const pageTitle = computed(() => t('marketplace.browse.titleAll', {
  count: providersPage.value?.total ?? 0,
  location: locationTitle.value,
}))

useSeoMeta({
  title: pageTitle,
  description: t('marketplace.browse.seoDescription'),
})
// One share image for every filter combination (a fixed title, not the filtered count): each distinct title was a
// separate satori render on the server, and the combinations are unbounded. The admin's default image wins when set.
useShareImage(null, 'MarketplaceSatori', {
  title: t('marketplace.browse.shareTitle'),
  eyebrow: t('marketplace.browse.seoEyebrow'),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
    <MarketplaceProviderBrowser
      v-model:filters="filters"
      v-model:draft="draft"
      v-model:search="searchInput"
      v-model:sheet-open="filterSheetOpen"
      :categories="categories ?? []"
      :result="providersPage"
      :carried-query="carriedQuery"
      @apply="applyDraft"
      @reset="resetDraft"
      @page="goToPage"
    >
      <template #heading>
        <h1 class="font-display text-2xl font-bold sm:text-3xl">
          {{ pageTitle }}
        </h1>
      </template>
    </MarketplaceProviderBrowser>
  </div>
</template>
