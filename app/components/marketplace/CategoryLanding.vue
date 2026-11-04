<script setup lang="ts">
import type { CategorySeoResponse, SkillSeoResponse } from '#shared/types/seo'
import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceCategoryLanding/>. The body of a category landing page (`/category/{category}`) and a
// sub-category one (`/category/{category}/{skill}`): the admin's SEO content around the same filter sidebar and
// provider list as Browse. The category, and the sub-category, come from the address; every other filter lives in
// the query string. The page loads `seoData` (and 404s) before rendering this.
const props = defineProps<{
  seoData: CategorySeoResponse | SkillSeoResponse
}>()

const { t } = useI18n()
const { settings } = useSiteSettings()

const isSkill = props.seoData.type === 'skill'
const categorySlug = props.seoData.type === 'skill' ? props.seoData.category.slug : props.seoData.entity.slug
const categoryName = props.seoData.type === 'skill' ? props.seoData.category.name : props.seoData.entity.name
const skillSlug = props.seoData.type === 'skill' ? props.seoData.entity.slug : undefined
const name = props.seoData.entity.name

const { filters, searchInput, providerQuery, carriedQuery, filterSheetOpen, draft, applyDraft, resetDraft, goToPage } = useBrowseFilters({
  category: categorySlug,
  skill: skillSlug,
  perPage: 8,
})

// Started together and awaited once: neither needs the other.
const categoriesRequest = useCategories({ withSkills: true })
const providersRequest = useApi<PagedResult<ProviderSummary>>('/providers', {
  query: providerQuery,
  key: `category-${categorySlug}-${skillSlug ?? 'all'}-providers`,
})
await Promise.all([categoriesRequest, providersRequest])
const { data: categories } = categoriesRequest
const { data: providersPage } = providersRequest

// Provider cards show a save heart: personal, so filled in after mount.
useSavedProviders().loadAfterMount()

const meta = computed(() => props.seoData.metadata)
useSeoLanding(meta, name)

const subCategories = computed(() => props.seoData.skills ?? [])
const relatedCategories = computed(() => props.seoData.type === 'category' ? (props.seoData.related_categories ?? []) : [])
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
    <MarketplaceSeoBreadcrumbs :items="meta.breadcrumbs" />

    <MarketplaceSeoRichContent
      v-if="meta.seo_header_content"
      :content="meta.seo_header_content"
      class="mb-8"
    />

    <MarketplaceProviderBrowser
      v-model:filters="filters"
      v-model:draft="draft"
      v-model:search="searchInput"
      v-model:sheet-open="filterSheetOpen"
      :categories="categories ?? []"
      :result="providersPage"
      :active-category="categorySlug"
      :active-skill="skillSlug ?? null"
      :carried-query="carriedQuery"
      :search-placeholder="t('seo.filters.searchCategory', { name })"
      @apply="applyDraft"
      @reset="resetDraft"
      @page="goToPage"
    >
      <template #heading>
        <div class="flex min-w-0 items-center gap-4">
          <NuxtImg
            v-if="seoData.entity.image_url"
            :src="seoData.entity.image_url"
            :alt="seoData.entity.image_alt ?? seoData.entity.name"
            width="64"
            height="64"
            class="hidden h-16 w-16 shrink-0 rounded-2xl object-cover sm:block"
          />
          <div
            v-else-if="seoData.entity.icon"
            class="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 sm:flex dark:bg-brand-700/20 dark:text-brand-100"
          >
            <UiIcon
              :name="asIconName(seoData.entity.icon)"
              :size="28"
            />
          </div>
          <div class="min-w-0">
            <p
              v-if="isSkill"
              class="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-100"
            >
              {{ categoryName }}
            </p>
            <!-- The count stays out of the h1, so the page's main heading is just the service name. -->
            <h1 class="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {{ t(isSkill ? 'seo.skill.title' : 'seo.category.title', { name }) }}
            </h1>
            <p class="mt-1 text-sm text-black/60 dark:text-white/60">
              {{ isSkill
                ? t('seo.skill.subtitle', { name: name.toLowerCase(), category: categoryName })
                : t('seo.category.subtitle', { name: name.toLowerCase() }) }}
              <span
                v-if="providersPage"
                class="ml-1 font-semibold text-black/70 dark:text-white/70"
              >
                · {{ t('seo.list.results', { count: providersPage.total }) }}
              </span>
            </p>
          </div>
        </div>
      </template>
    </MarketplaceProviderBrowser>

    <!-- The category's sub-categories (or, on a sub-category page, its siblings): crawlable links to their pages. -->
    <div
      v-if="subCategories.length > 0"
      class="mt-12 rounded-3xl border border-black/10 bg-white/50 p-6 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/20"
    >
      <h2 class="mb-4 font-display text-xl font-bold sm:text-2xl">
        {{ t('seo.skill.browseIn', { category: categoryName }) }}
      </h2>
      <div class="flex flex-wrap gap-2">
        <NuxtLinkLocale
          v-for="sub in subCategories"
          :key="sub.id"
          :to="sub.url"
          class="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          :class="sub.slug === skillSlug
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10'"
          :aria-current="sub.slug === skillSlug ? 'page' : undefined"
        >
          {{ sub.name }}
        </NuxtLinkLocale>
      </div>
    </div>

    <div
      v-if="relatedCategories.length > 0"
      class="mt-8 mb-12 rounded-3xl border border-black/10 bg-white/50 p-6 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/20"
    >
      <h2 class="mb-4 font-display text-xl font-bold sm:text-2xl">
        {{ t('seo.category.related') }}
      </h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <NuxtLinkLocale
          v-for="relCat in relatedCategories"
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

    <MarketplaceSeoReviews :reviews="meta.seo_reviews ?? []" />
    <MarketplaceSeoRichContent
      v-if="meta.seo_footer_content"
      :content="meta.seo_footer_content"
      :heading="t('seo.category.about', { name, site: settings.siteName ?? t('brand.name') })"
      class="mt-8"
    />

    <MarketplaceSeoFaq :items="meta.seo_faqs ?? []" />
  </div>
</template>
