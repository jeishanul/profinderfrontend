<script setup lang="ts">
import type { GalleryItem, GalleryTab, ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceJobsGallery />.
const props = defineProps<{
  itemsByTab: Record<GalleryTab, GalleryItem[]>
  categories: ServiceCategory[]
}>()

const { t } = useI18n()

const TABS: GalleryTab[] = ['home', 'recommended', 'trending']
const activeTab = ref<GalleryTab>('home')
const currentItems = computed(() => props.itemsByTab[activeTab.value])

const CARD_STEP_PX = 296
const carousel = useCarousel(() => currentItems.value.length, { visibleCount: 3, intervalMs: 3600 })
// Below `sm` this is a native scroll-snap strip instead (see the template
// and CategoryCarousel.vue's matching comment) — the JS transform only
// drives the desktop/tablet arrow-button version.
const isDesktop = useMediaQuery('(min-width: 640px)')
const trackStyle = computed(() => (isDesktop.value
  ? { transform: `translateX(-${carousel.index.value * CARD_STEP_PX}px)` }
  : {}))

function selectTab(tab: GalleryTab) {
  activeTab.value = tab
  carousel.goTo(0)
}
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
    <div class="mb-7 flex items-center justify-between gap-4">
      <h2 class="font-display text-3xl font-bold sm:text-4xl">
        {{ t('marketplace.gallery.heading') }}
      </h2>
    </div>

    <div class="mb-7 flex flex-wrap gap-2.5">
      <button
        v-for="tab in TABS"
        :key="tab"
        type="button"
        class="rounded-full px-5 py-2.5 text-sm font-bold transition-colors"
        :class="activeTab === tab
          ? 'bg-brand-600 text-white'
          : 'border border-black/10 bg-white text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60'"
        @click="selectTab(tab)"
      >
        {{ t(`marketplace.gallery.tabs.${tab}`) }}
      </button>
    </div>

    <div class="relative">
      <!-- Autoplay pause-on-hover/focus is a decorative enhancement — full
           manual control already exists via the arrow buttons below, so this
           region intentionally isn't given a fake interactive role. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        role="region"
        class="-mx-4 overflow-x-auto scrollbar-hide px-4 sm:mx-0 sm:overflow-hidden sm:px-0"
        :aria-label="t(`marketplace.gallery.tabs.${activeTab}`)"
        @mouseenter="carousel.pause()"
        @mouseleave="carousel.resume()"
        @focusin="carousel.pause()"
        @focusout="carousel.resume()"
      >
        <div
          class="flex snap-x snap-mandatory gap-5 transition-transform duration-500 ease-out sm:snap-none"
          :style="trackStyle"
        >
          <div
            v-for="(item, index) in currentItems"
            :key="`${activeTab}-${index}`"
            class="w-[276px] shrink-0 snap-start"
          >
            <div class="h-[190px] overflow-hidden rounded-2xl">
              <UiPlaceholderMedia
                :icon="getCategoryIcon(categories, item.categoryId)"
                label="276 x 190"
              />
            </div>
            <p class="mt-3 font-semibold">
              {{ t(`marketplace.categories.${item.categoryId}.label`) }}
            </p>
          </div>
        </div>
      </div>
      <button
        type="button"
        class="absolute -left-5 top-[78px] hidden h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-brand-50 sm:flex dark:bg-black/70 dark:text-white"
        :aria-label="t('marketplace.gallery.previous')"
        @click="carousel.prev()"
      >
        <UiIcon
          name="arrow-right"
          class="rotate-180"
          :size="16"
        />
      </button>
      <button
        type="button"
        class="absolute -right-5 top-[78px] hidden h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-brand-50 sm:flex dark:bg-black/70 dark:text-white"
        :aria-label="t('marketplace.gallery.next')"
        @click="carousel.next()"
      >
        <UiIcon
          name="arrow-right"
          :size="16"
        />
      </button>
    </div>
  </section>
</template>
