<script setup lang="ts">
import type { ProviderSummary, ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceFeaturedProviders />.
const props = defineProps<{
  providers: ProviderSummary[]
  categories: ServiceCategory[]
}>()

const { t } = useI18n()

const showAll = ref(false)
const visibleProviders = computed(() => (showAll.value ? props.providers : props.providers.slice(0, 4)))
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
    <div class="mb-9">
      <h2 class="font-display text-3xl font-bold sm:text-4xl">
        {{ t('marketplace.featuredProviders.heading') }}
      </h2>
      <p class="mt-2.5 text-black/60 dark:text-white/60">
        {{ t('marketplace.featuredProviders.subheading') }}
      </p>
    </div>

    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <MarketplaceProviderCard
        v-for="provider in visibleProviders"
        :key="provider.id"
        :provider="provider"
        :category-icon="getCategoryIcon(categories, provider.categoryId)"
      />
    </div>

    <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
      <UiButton
        variant="ghost"
        @click="showAll = !showAll"
      >
        {{ showAll ? t('marketplace.featuredProviders.showFewer') : t('marketplace.featuredProviders.viewMore') }}
      </UiButton>
      <NuxtLinkLocale
        :to="{ path: '/browse', query: { sort: 'rating' } }"
        :class="linkButtonClass('ghost')"
      >
        {{ t('marketplace.featuredProviders.browseAll') }}
      </NuxtLinkLocale>
    </div>
  </section>
</template>
