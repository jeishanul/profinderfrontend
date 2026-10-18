<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'
import type { JobPostBase } from '#shared/types/jobPosts'
import type { ProviderSummary, ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceFeaturedProviders />.
const props = defineProps<{
  section: HomeSection
  providers: ProviderSummary[]
  categories: ServiceCategory[]
  /** True when the list really is that province's pros; otherwise the heading and subheading stay general. */
  local?: boolean
}>()

const { t } = useI18n()

// In manual mode the section is the admin's own list: with nothing featured there is nothing to show, so it hides
// (the automatic list keeps its heading, as before).
const hasContent = computed(() => featuredMode(props.section.settings) === 'auto' || props.providers.length > 0)

const isManual = computed(() => featuredMode(props.section.settings) === 'manual')
const activeTab = ref<'providers' | 'jobs'>('providers')

// Fetch latest jobs for the tab toggle
const { data: latestJobsData } = useApi<{ items: JobPostBase[], total: number }>('/jobs/latest', {
  key: 'home-featured-latest-jobs',
  default: () => ({ items: [], total: 0 }),
})
const latestJobs = computed(() => latestJobsData.value?.items ?? [])

const showAll = ref(false)
const visibleProviders = computed(() => (showAll.value ? props.providers : props.providers.slice(0, 4)))

// The province the user last searched (set by the hero/browse search bar —
// see `useLastSearch`), so "Featured" can say where it's actually sampling
// from instead of a blanket "near you" that never reflected real location data.
const lastSearch = useLastSearch()
const { data: provinces } = useApi<{ code: string, name: string }[]>('/locations/provinces', {
  key: 'ph-provinces',
  default: () => [],
})
const lastSearchProvinceName = computed(() => {
  const code = lastSearch.value?.provinceCode
  return code ? (provinces.value?.find(p => p.code === code)?.name ?? null) : null
})

// The admin's heading wins; otherwise the built-in one:
// When manual mode is active, the heading says "Featured Providers"; when local, names the province.
const defaultHeading = computed(() => {
  if (activeTab.value === 'jobs') return t('marketplace.latestJobs.heading')
  if (isManual.value) return t('marketplace.featuredProviders.headingFeatured')
  return props.local && lastSearchProvinceName.value
    ? t('marketplace.featuredProviders.headingWithLocation', { province: lastSearchProvinceName.value })
    : t('marketplace.featuredProviders.heading')
})

const defaultSubheading = computed(() => {
  if (activeTab.value === 'jobs') return t('marketplace.latestJobs.subheading')
  if (isManual.value) return t('marketplace.featuredProviders.subheadingFeatured')
  return props.local
    ? t('marketplace.featuredProviders.subheadingLocal')
    : t('marketplace.featuredProviders.subheading')
})

const heading = computed(() => cmsText(props.section.heading, defaultHeading.value))
const subheading = computed(() => cmsText(props.section.subheading, defaultSubheading.value))
</script>

<template>
  <section
    v-if="hasContent"
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <div class="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h2 class="font-display text-3xl font-bold sm:text-4xl">
          {{ heading }}
        </h2>
        <p class="mt-2.5 text-black/60 dark:text-white/60">
          {{ subheading }}
        </p>
      </div>

      <div class="flex items-center gap-1 self-start rounded-full border border-black/10 bg-white/70 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-black/30 md:self-auto">
        <button
          type="button"
          class="rounded-full px-4 py-1.5 text-xs font-semibold transition"
          :class="activeTab === 'providers' ? 'bg-brand-600 text-white shadow-sm' : 'text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white'"
          @click="activeTab = 'providers'"
        >
          {{ isManual ? t('marketplace.featuredProviders.headingFeatured') : t('marketplace.featuredProviders.tabPros') }}
        </button>
        <button
          type="button"
          class="rounded-full px-4 py-1.5 text-xs font-semibold transition"
          :class="activeTab === 'jobs' ? 'bg-brand-600 text-white shadow-sm' : 'text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white'"
          @click="activeTab = 'jobs'"
        >
          {{ t('marketplace.featuredProviders.tabJobs') }}
        </button>
      </div>
    </div>

    <!-- Providers view -->
    <template v-if="activeTab === 'providers'">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MarketplaceProviderCard
          v-for="provider in visibleProviders"
          :key="provider.id"
          :provider="provider"
        />
      </div>

      <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
        <UiButton
          v-if="providers.length > 4"
          variant="ghost"
          @click="showAll = !showAll"
        >
          {{ showAll ? t('marketplace.featuredProviders.showFewer') : t('marketplace.featuredProviders.viewMore') }}
        </UiButton>
        <CmsLink
          v-if="section.ctaUrl"
          :to="section.ctaUrl"
          :class="linkButtonClass('ghost')"
        >
          {{ cmsText(section.ctaLabel, t('marketplace.featuredProviders.browseAll')) }}
        </CmsLink>
        <NuxtLinkLocale
          v-else
          :to="{ path: '/browse', query: { sort: 'rating' } }"
          :class="linkButtonClass('ghost')"
        >
          {{ cmsText(section.ctaLabel, t('marketplace.featuredProviders.browseAll')) }}
        </NuxtLinkLocale>
      </div>
    </template>

    <!-- Latest Jobs view -->
    <template v-else>
      <div
        v-if="latestJobs.length > 0"
        class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <MarketplaceJobCard
          v-for="job in latestJobs"
          :key="job.id"
          :post="job"
        />
      </div>
      <div
        v-else
        class="rounded-2xl border border-black/10 bg-white/50 p-8 text-center text-sm text-black/60 dark:border-white/10 dark:bg-black/20 dark:text-white/60"
      >
        {{ t('marketplace.latestJobs.empty') }}
      </div>

      <div class="mt-9 flex items-center justify-center">
        <NuxtLinkLocale
          to="/jobs"
          :class="linkButtonClass('ghost')"
        >
          {{ t('marketplace.latestJobs.viewAll') }}
        </NuxtLinkLocale>
      </div>
    </template>
  </section>
</template>
