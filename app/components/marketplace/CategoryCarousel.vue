<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'
import type { ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceCategoryCarousel />.
const props = defineProps<{
  section: HomeSection
  categories: ServiceCategory[]
}>()

const { t } = useI18n()

const shownCategories = computed(() => props.categories.slice(0, sectionNumber(props.section.settings, 'maxItems', 24)))
const carousel = useCarousel(() => shownCategories.value.length, { visibleCount: 4, intervalMs: 3000 })

const CARD_STEP_PX = 272
// Below `sm` this is a native scroll-snap strip instead (see the template) —
// a real swipe gesture, not a "carousel" a phone user can only advance via
// tiny arrow buttons. The JS transform below only drives the desktop/tablet
// arrow-button version; leaving it applied on mobile too would fight the
// browser's own scroll position for the same axis.
const isDesktop = useMediaQuery('(min-width: 640px)')
const trackStyle = computed(() => (isDesktop.value
  ? { transform: `translateX(-${carousel.index.value * CARD_STEP_PX}px)` }
  : {}))
</script>

<template>
  <section
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <div class="mb-9 flex items-end justify-between gap-4">
      <div>
        <h2 class="font-display text-3xl font-bold sm:text-4xl">
          {{ cmsText(section.heading, t('marketplace.categories.heading')) }}
        </h2>
        <p class="mt-2.5 text-black/60 dark:text-white/60">
          {{ cmsText(section.subheading, t('marketplace.categories.subheading')) }}
        </p>
      </div>
      <div class="hidden shrink-0 gap-2.5 sm:flex">
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 hover:bg-brand-50 dark:border-white/10 dark:hover:bg-white/10"
          :aria-label="t('marketplace.categories.previous')"
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
          class="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 hover:bg-brand-50 dark:border-white/10 dark:hover:bg-white/10"
          :aria-label="t('marketplace.categories.next')"
          @click="carousel.next()"
        >
          <UiIcon
            name="arrow-right"
            :size="16"
          />
        </button>
      </div>
    </div>

    <!-- Autoplay pause-on-hover/focus is a decorative enhancement — full manual
         control already exists via the arrow buttons above, so this region
         intentionally isn't given a fake interactive role. -->
    <!-- `-my-4`/`py-4` cancel out (no layout shift) but give hover:shadow-lg
         room to render before overflow-hidden clips it — without this the
         top/bottom of the shadow was cut off flush against the track. -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
    <div
      role="region"
      class="-my-4 -mx-4 overflow-x-auto scrollbar-hide px-4 py-4 sm:mx-0 sm:overflow-hidden sm:px-0"
      :aria-label="cmsText(section.heading, t('marketplace.categories.heading'))"
      @mouseenter="carousel.pause()"
      @mouseleave="carousel.resume()"
      @focusin="carousel.pause()"
      @focusout="carousel.resume()"
    >
      <div
        class="flex snap-x snap-mandatory gap-5 transition-transform duration-500 ease-out sm:snap-none"
        :style="trackStyle"
      >
        <NuxtLinkLocale
          v-for="category in shownCategories"
          :key="category.id"
          :to="`/category/${category.id}`"
          class="flex w-[252px] shrink-0 snap-start items-center gap-4 rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-black/30"
        >
          <NuxtImg
            v-if="category.imageUrl"
            :src="category.imageUrl"
            :alt="category.imageAlt ?? ''"
            loading="lazy"
            width="52"
            height="52"
            class="h-[52px] w-[52px] shrink-0 rounded-2xl object-cover"
          />
          <div
            v-else
            class="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100"
          >
            <UiIcon
              :name="asIconName(category.icon)"
              :size="24"
            />
          </div>
          <div class="min-w-0">
            <p class="truncate font-semibold">
              {{ category.name }}
            </p>
            <p class="mt-0.5 truncate text-sm text-black/50 dark:text-white/50">
              {{ t('marketplace.categories.countLabel', { count: category.providerCount }) }}
            </p>
          </div>
        </NuxtLinkLocale>
      </div>
    </div>

    <div
      v-if="section.ctaUrl && cmsOptionalText(section.ctaLabel)"
      class="mt-8 flex justify-center"
    >
      <CmsLink
        :to="section.ctaUrl"
        :class="linkButtonClass('ghost')"
      >
        {{ section.ctaLabel }}
      </CmsLink>
    </div>
  </section>
</template>
