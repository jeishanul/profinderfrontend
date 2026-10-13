<script setup lang="ts">
import type { CategorySeoResponse } from '#shared/types/seo'
import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

// One component per category: moving between two landing pages rebuilds it, so head, schema and filters never go stale.
definePageMeta({ key: route => route.path })

const route = useRoute()
const { t } = useI18n()
const { settings } = useSiteSettings()

const slug = String(route.params.slug || '')

const { data: seoData, error: seoError } = await useApi<CategorySeoResponse>(`/seo/category/${encodeURIComponent(slug)}`, {
  key: `seo-category-${slug}`,
})

if (seoError.value || !seoData.value) {
  const status = seoError.value?.statusCode ?? 404
  throw createError({
    statusCode: status,
    statusMessage: status === 404 ? t('errors.notFound') : t('errors.somethingWrong'),
    fatal: true,
  })
}

// Provider cards show a save heart, so the saved ids must be known before they render.
await useSavedProviders().ensureLoaded()

const meta = computed(() => seoData.value!.metadata)
useSeoLanding(meta, seoData.value.entity.name)

const { currentPage, currentSort, searchInput, listQuery, goToPage } = useSeoProviderFilters()

const providerQuery = computed(() => ({ ...listQuery.value, categories: slug }))
const { data: providersPage, status: providersStatus } = await useApi<PagedResult<ProviderSummary>>('/providers', {
  query: providerQuery,
  key: `category-${slug}-providers`,
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
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <div
            v-if="seoData.entity.icon"
            class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100"
          >
            <UiIcon
              :name="asIconName(seoData.entity.icon)"
              :size="32"
            />
          </div>
          <div>
            <h1 class="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {{ t('seo.category.title', { name: seoData.entity.name }) }}
            </h1>
            <p class="mt-1 text-sm text-black/60 dark:text-white/60">
              {{ t('seo.category.subtitle', { name: seoData.entity.name.toLowerCase() }) }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <NuxtLinkLocale
            to="/browse"
            class="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            {{ t('seo.category.allServices') }} &rarr;
          </NuxtLinkLocale>
        </div>
      </div>

      <MarketplaceSeoFilters
        v-model:search="searchInput"
        v-model:sort="currentSort"
        :placeholder="t('seo.filters.searchCategory', { name: seoData.entity.name })"
      />
    </div>

    <MarketplaceSeoProviderList
      :heading="t('seo.category.heading')"
      :result="providersPage"
      :pending="providersStatus === 'pending'"
      :current-page="currentPage"
      :empty-title="t('seo.category.emptyTitle')"
      :empty-hint="t('seo.category.emptyHint')"
      @page="goToPage"
    />

    <div
      v-if="seoData.related_categories && seoData.related_categories.length > 0"
      class="mb-12 rounded-3xl border border-black/10 bg-white/50 p-6 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/20"
    >
      <h2 class="mb-4 font-display text-xl font-bold sm:text-2xl">
        {{ t('seo.category.related') }}
      </h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <NuxtLinkLocale
          v-for="relCat in seoData.related_categories"
          :key="relCat.id"
          :to="relCat.url"
          class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white/80 p-4 text-center transition-transform hover:-translate-y-0.5 hover:shadow-xs dark:border-white/5 dark:bg-white/5"
        >
          <div
            v-if="relCat.icon"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100"
          >
            <UiIcon
              :name="asIconName(relCat.icon)"
              :size="20"
            />
          </div>
          <span class="text-xs font-semibold text-black/80 dark:text-white/80">
            {{ relCat.name }}
          </span>
        </NuxtLinkLocale>
      </div>
    </div>

    <MarketplaceSeoRichContent
      v-if="meta.seo_footer_content"
      :content="meta.seo_footer_content"
      :heading="t('seo.category.about', { name: seoData.entity.name, site: settings.siteName ?? t('brand.name') })"
      class="mt-8"
    />
  </div>
</template>
