<script setup lang="ts">
import type { ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceHeroSlider />.
defineProps<{
  categories: ServiceCategory[]
}>()

const emit = defineEmits<{
  search: [{ category: string, province: string, city: string, barangay: string }]
}>()

const { t } = useI18n()

const FALLBACK_IDS = ['general', 'repair', 'cleaning'] as const
const TONES: Array<'primary' | 'accent'> = ['primary', 'accent', 'primary']
const DEFAULT_ICONS: IconName[] = ['search', 'wrench', 'broom']

// The admin's slides, else the built-in three.
const content = useContentSection('hero_slides')
const slides = computed(() => content.value.length > 0
  ? content.value.map((item, index) => ({
      id: `cms-${index}`,
      headline: item.title ?? '',
      sub: item.description ?? '',
      imageUrl: item.imageUrl,
      icon: knownIcon(item.icon, DEFAULT_ICONS[index % DEFAULT_ICONS.length]!),
      tone: TONES[index % TONES.length]!,
    }))
  : FALLBACK_IDS.map((id, index) => ({
      id,
      headline: t(`marketplace.hero.slides.${id}.headline`),
      sub: t(`marketplace.hero.slides.${id}.sub`),
      imageUrl: null as string | null,
      icon: DEFAULT_ICONS[index]!,
      tone: TONES[index]!,
    })))

const carousel = useCarousel(() => slides.value.length, { intervalMs: 5000 })
const activeSlide = computed(() => slides.value[carousel.index.value] ?? slides.value[0]!)

const toneClasses: Record<'primary' | 'accent', string> = {
  primary: 'bg-brand-50 dark:bg-brand-700/20',
  accent: 'bg-accent-50 dark:bg-accent-700/20',
}

function handleSearch(payload: { category: string, province: string, city: string, barangay: string }) {
  emit('search', payload)
}

const searchAnchor = useTemplateRef('searchAnchor')
const { observe } = useHeroSearchDock()
observe(searchAnchor)
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 pt-9 sm:px-6 lg:px-10">
    <div class="relative">
      <!-- Autoplay pause-on-hover/focus is a decorative enhancement — full
           manual control already exists via the arrow/dot controls below, so
           this region intentionally isn't given a fake interactive role. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        role="region"
        class="relative flex min-h-[420px] items-center overflow-hidden rounded-[32px] px-6 py-12 transition-colors duration-500 sm:px-12 md:min-h-[480px]"
        :class="toneClasses[activeSlide.tone]"
        :aria-label="t('marketplace.hero.regionLabel')"
        @mouseenter="carousel.pause()"
        @mouseleave="carousel.resume()"
        @focusin="carousel.pause()"
        @focusout="carousel.resume()"
      >
        <div class="relative z-10 max-w-xl">
          <p class="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:bg-black/30 dark:text-brand-100">
            <UiIcon
              name="shield-check"
              :size="14"
            />
            {{ t('marketplace.hero.trustBadge') }}
          </p>
          <h1 class="text-3xl font-bold leading-tight sm:text-4xl md:text-[44px]">
            {{ activeSlide.headline }}
          </h1>
          <p class="mt-4 max-w-md text-base leading-relaxed text-black/60 dark:text-white/60 md:text-lg">
            {{ activeSlide.sub }}
          </p>
        </div>

        <div class="absolute right-10 top-1/2 hidden h-56 w-56 -translate-y-1/2 items-center justify-center rounded-full bg-white/50 text-brand-700 dark:bg-black/20 dark:text-brand-100 md:flex">
          <img
            v-if="activeSlide.imageUrl"
            :src="activeSlide.imageUrl"
            :alt="activeSlide.headline"
            class="h-full w-full rounded-full object-cover"
          >
          <UiIcon
            v-else
            :name="activeSlide.icon"
            :size="96"
          />
        </div>

        <div class="absolute bottom-11 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          <button
            v-for="(slide, slideIndex) in slides"
            :key="slide.id"
            type="button"
            class="h-2 rounded-full transition-all"
            :class="slideIndex === carousel.index.value ? 'w-[22px] bg-brand-600' : 'w-2 bg-black/15 dark:bg-white/25'"
            :aria-label="t('marketplace.hero.goToSlide', { number: slideIndex + 1 })"
            @click="carousel.goTo(slideIndex)"
          />
        </div>
      </div>

      <!-- In-flow (not absolute) below `sm` — the stacked mobile search bar
           (see ServiceSearchBar.vue) is much taller than the single-row
           pill this `-bottom-9` dock offset was tuned for; anchoring it by
           `bottom` regardless of height meant it could ride up and cover
           the headline. A small negative margin gives the same "docked,
           slightly overlapping" look without depending on a fixed height,
           and lets normal document flow push `TrustStats` down by however
           tall the search bar actually ends up. `sm:` and up restores the
           original absolute dock, unchanged (that pill's height is stable). -->
      <div
        ref="searchAnchor"
        class="relative -mt-8 px-4 sm:absolute sm:inset-x-10 sm:-bottom-9 sm:mt-0 sm:px-0"
      >
        <MarketplaceServiceSearchBar
          :categories="categories"
          class="mx-auto max-w-2xl"
          @submit="handleSearch"
        />
      </div>
    </div>
  </section>
</template>
