<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'
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
// The admin's heading wins; otherwise the built-in one, which names the province when the list is local.
const heading = computed(() => cmsText(props.section.heading, props.local && lastSearchProvinceName.value
  ? t('marketplace.featuredProviders.headingWithLocation', { province: lastSearchProvinceName.value })
  : t('marketplace.featuredProviders.heading')))
const subheading = computed(() => cmsText(props.section.subheading, props.local ? t('marketplace.featuredProviders.subheadingLocal') : t('marketplace.featuredProviders.subheading')))
</script>

<template>
  <section
    v-if="hasContent"
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <div class="mb-9">
      <h2 class="font-display text-3xl font-bold sm:text-4xl">
        {{ heading }}
      </h2>
      <p class="mt-2.5 text-black/60 dark:text-white/60">
        {{ subheading }}
      </p>
    </div>

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
  </section>
</template>
