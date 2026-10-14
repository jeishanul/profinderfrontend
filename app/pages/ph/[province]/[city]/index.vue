<script setup lang="ts">
import type { LocationSeoResponse } from '#shared/types/seo'
import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

definePageMeta({ key: route => route.path })

const route = useRoute()
const { t } = useI18n()

const provinceSlug = String(route.params.province || '')
const citySlug = String(route.params.city || '')

// The key carries every parent slug: city slugs repeat across provinces.
const { data: seoData, error: seoError } = await useApi<LocationSeoResponse>(
  `/seo/location/${encodeURIComponent(provinceSlug)}/${encodeURIComponent(citySlug)}`,
  { key: `seo-city-${provinceSlug}-${citySlug}` },
)

if (seoError.value || !seoData.value) {
  const status = seoError.value?.statusCode ?? 404
  throw createError({
    statusCode: status,
    statusMessage: status === 404 ? t('errors.notFound') : t('errors.somethingWrong'),
    fatal: true,
  })
}

// Hearts: personal, so filled in after mount. (The provider list below still waits for the metadata: it needs the
// city's code, since city slugs repeat across provinces.)
useSavedProviders().loadAfterMount()

const meta = computed(() => seoData.value!.metadata)
const provinceName = computed(() => seoData.value?.hierarchy.province?.name ?? '')
useSeoLanding(meta, `${seoData.value.entity.name}, ${provinceName.value}`)

const { currentPage, currentSort, searchInput, listQuery, goToPage } = useSeoProviderFilters()

const providerQuery = computed(() => ({ ...listQuery.value, city: seoData.value?.entity.code || undefined }))
const { data: providersPage, status: providersStatus } = await useApi<PagedResult<ProviderSummary>>('/providers', {
  query: providerQuery,
  key: `city-${provinceSlug}-${citySlug}-providers`,
})
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
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              {{ t('seo.city.badge') }}
            </span>
            <NuxtLinkLocale
              v-if="seoData.hierarchy.province"
              :to="`/ph/${seoData.hierarchy.province.slug}`"
              class="text-xs font-medium text-black/60 hover:text-brand-600 dark:text-white/60 dark:hover:text-brand-400"
            >
              {{ t('seo.city.inProvince', { province: provinceName }) }} &rarr;
            </NuxtLinkLocale>
          </div>
          <h1 class="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            {{ t('seo.city.title', { name: seoData.entity.name }) }}
          </h1>
          <p class="mt-1 text-sm text-black/60 dark:text-white/60">
            {{ t('seo.city.subtitle', { name: seoData.entity.name, province: provinceName }) }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <NuxtLinkLocale
            v-if="seoData.hierarchy.province"
            :to="`/ph/${seoData.hierarchy.province.slug}`"
            class="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            {{ t('seo.city.allOfProvince', { province: provinceName }) }} &rarr;
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
      :heading="t('seo.city.heading', { name: seoData.entity.name })"
      :result="providersPage"
      :pending="providersStatus === 'pending'"
      :current-page="currentPage"
      :empty-title="t('seo.city.emptyTitle', { name: seoData.entity.name })"
      :empty-hint="t('seo.city.emptyHint', { province: provinceName })"
      @page="goToPage"
    />

    <div
      v-if="seoData.barangays && seoData.barangays.length > 0"
      class="mb-12 rounded-3xl border border-black/10 bg-white/50 p-6 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/20"
    >
      <h2 class="mb-4 font-display text-xl font-bold sm:text-2xl">
        {{ t('seo.city.barangays', { name: seoData.entity.name }) }}
      </h2>
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <NuxtLinkLocale
          v-for="item in seoData.barangays"
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
      :heading="t('seo.city.about', { name: seoData.entity.name })"
      class="mt-8"
    />
  </div>
</template>
