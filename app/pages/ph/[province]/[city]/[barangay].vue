<script setup lang="ts">
import type { LocationSeoResponse } from '#shared/types/seo'
import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

definePageMeta({ key: route => route.path })

const route = useRoute()
const { t } = useI18n()

const provinceSlug = String(route.params.province || '')
const citySlug = String(route.params.city || '')
const barangaySlug = String(route.params.barangay || '')

// Barangay names repeat across cities, so the key (and the lookup) always includes the parents.
const { data: seoData, error: seoError } = await useApi<LocationSeoResponse>(
  `/seo/location/${encodeURIComponent(provinceSlug)}/${encodeURIComponent(citySlug)}/${encodeURIComponent(barangaySlug)}`,
  { key: `seo-barangay-${provinceSlug}-${citySlug}-${barangaySlug}` },
)

if (seoError.value || !seoData.value) {
  const status = seoError.value?.statusCode ?? 404
  throw createError({
    statusCode: status,
    statusMessage: status === 404 ? t('errors.notFound') : t('errors.somethingWrong'),
    fatal: true,
  })
}

await useSavedProviders().ensureLoaded()

const meta = computed(() => seoData.value!.metadata)
const cityName = computed(() => seoData.value?.hierarchy.city?.name ?? '')
const provinceName = computed(() => seoData.value?.hierarchy.province?.name ?? '')
useSeoLanding(meta, `${seoData.value.entity.name}, ${cityName.value}`)

const { currentPage, currentSort, searchInput, listQuery, goToPage } = useSeoProviderFilters()

const cityCode = computed(() => seoData.value?.hierarchy.city?.code || undefined)

// First choice: providers in this exact barangay (looked up inside its city).
const barangayQuery = computed(() => ({ ...listQuery.value, city: cityCode.value, barangay: seoData.value?.entity.slug }))
const { data: barangayProviders, status: barangayStatus } = await useApi<PagedResult<ProviderSummary>>('/providers', {
  query: barangayQuery,
  key: `barangay-${provinceSlug}-${citySlug}-${barangaySlug}-providers`,
})

// Fallback: with nobody listed in the barangay, show providers serving the whole city.
const isFallback = computed(() => (barangayProviders.value?.total ?? 0) === 0)
const cityFallbackQuery = computed(() => ({ ...listQuery.value, city: cityCode.value }))
const { data: cityFallbackProviders } = await useApi<PagedResult<ProviderSummary>>('/providers', {
  query: cityFallbackQuery,
  key: `barangay-${provinceSlug}-${citySlug}-${barangaySlug}-city-fallback`,
})

const activeProvidersPage = computed(() => isFallback.value ? cityFallbackProviders.value : barangayProviders.value)
</script>

<template>
  <div
    v-if="seoData"
    class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10"
  >
    <MarketplaceSeoBreadcrumbs :items="meta.breadcrumbs" />

    <MarketplaceSeoRichContent
      v-if="meta.seo_header_content"
      :content="meta.seo_header_content"
      class="mb-8"
    />

    <div class="mb-8 rounded-3xl border border-black/10 bg-white/70 p-6 shadow-xs backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/30">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              {{ t('seo.barangay.badge') }}
            </span>
            <NuxtLinkLocale
              v-if="seoData.hierarchy.city && seoData.hierarchy.province"
              :to="`/ph/${seoData.hierarchy.province.slug}/${seoData.hierarchy.city.slug}`"
              class="text-xs font-medium text-black/60 hover:text-brand-600 dark:text-white/60 dark:hover:text-brand-400"
            >
              {{ t('seo.barangay.inCity', { city: cityName, province: provinceName }) }} &rarr;
            </NuxtLinkLocale>
          </div>
          <h1 class="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            {{ t('seo.barangay.title', { name: seoData.entity.name }) }}
          </h1>
          <p class="mt-1 text-sm text-black/60 dark:text-white/60">
            {{ t('seo.barangay.subtitle', { name: seoData.entity.name, city: cityName }) }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <NuxtLinkLocale
            v-if="seoData.hierarchy.city && seoData.hierarchy.province"
            :to="`/ph/${seoData.hierarchy.province.slug}/${seoData.hierarchy.city.slug}`"
            class="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            {{ t('seo.barangay.allOfCity', { city: cityName }) }} &rarr;
          </NuxtLinkLocale>
        </div>
      </div>

      <MarketplaceSeoFilters
        v-model:search="searchInput"
        v-model:sort="currentSort"
        :placeholder="t('seo.filters.searchIn', { place: seoData.entity.name })"
      />
    </div>

    <MarketplaceSeoProviderList
      :heading="isFallback ? t('seo.barangay.headingFallback', { name: seoData.entity.name, city: cityName }) : t('seo.barangay.heading', { name: seoData.entity.name })"
      :result="activeProvidersPage"
      :pending="barangayStatus === 'pending'"
      :current-page="currentPage"
      :note="isFallback ? t('seo.barangay.fallbackNote', { name: seoData.entity.name, city: cityName }) : undefined"
      :empty-title="t('seo.barangay.emptyTitle', { name: seoData.entity.name, city: cityName })"
      :empty-hint="t('seo.barangay.emptyHint')"
      @page="goToPage"
    />

    <div
      v-if="seoData.siblings && seoData.siblings.length > 0"
      class="mb-12 rounded-3xl border border-black/10 bg-white/50 p-6 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/20"
    >
      <h2 class="mb-4 font-display text-xl font-bold sm:text-2xl">
        {{ t('seo.barangay.others', { city: cityName }) }}
      </h2>
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <NuxtLinkLocale
          v-for="item in seoData.siblings"
          :key="item.id ?? item.code ?? item.slug"
          :to="item.url"
          class="flex items-center gap-2 rounded-xl border border-black/5 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-black/80 transition-transform hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-700 dark:border-white/5 dark:bg-white/5 dark:text-white/80 dark:hover:text-brand-400"
        >
          <UiIcon
            name="map-pin"
            :size="14"
            class="shrink-0 text-brand-600 dark:text-brand-400"
          />
          <span class="truncate">{{ item.name }}</span>
        </NuxtLinkLocale>
      </div>
    </div>

    <MarketplaceSeoRichContent
      v-if="meta.seo_footer_content"
      :content="meta.seo_footer_content"
      :heading="t('seo.barangay.about', { name: seoData.entity.name })"
      class="mt-8"
    />
  </div>
</template>
