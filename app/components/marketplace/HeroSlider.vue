<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'
import type { ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceHeroSlider />. The admin's slides (`section.items`), else the built-in three.
const props = defineProps<{
  section: HomeSection
  /** "Trusted by N+ pros" — the live badge text from the CMS, else the built-in copy. */
  badge: string | null
  categories: ServiceCategory[]
}>()

const emit = defineEmits<{
  search: [{ category: string, province: string, city: string, barangay: string }]
}>()

const { t } = useI18n()

const FALLBACK_IDS = ['general', 'repair', 'cleaning'] as const
const FALLBACK_ICONS: IconName[] = ['search', 'wrench', 'broom']
const FALLBACK_TONES: HeroTone[] = ['primary', 'accent', 'primary']

const slides = computed<HeroSlide[]>(() => {
  const cms = buildHeroSlides(props.section.items)
  if (cms.length > 0) return cms

  return FALLBACK_IDS.map((id, index) => ({
    id,
    headline: t(`marketplace.hero.slides.${id}.headline`),
    sub: t(`marketplace.hero.slides.${id}.sub`),
    eyebrow: null,
    ctaLabel: null,
    ctaUrl: null,
    secondaryCtaLabel: null,
    secondaryCtaUrl: null,
    imageUrl: null,
    mobileImageUrl: null,
    imageAlt: '',
    icon: FALLBACK_ICONS[index]!,
    tone: FALLBACK_TONES[index]!,
    layout: 'split' as const,
    overlay: 40,
    align: 'left' as const,
    focalX: 50,
    focalY: 50,
  }))
})

const trustBadgeText = computed(() => cmsText(props.badge, t('marketplace.hero.trustBadge')))

// No autoplay for people who asked their system for reduced motion; the arrows and dots still work.
const reducedMotion = usePreferredReducedMotion()
const carousel = useCarousel(() => slides.value.length, {
  intervalMs: sectionNumber(props.section.settings, 'intervalMs', 5000),
  autoplay: reducedMotion.value !== 'reduce',
})
const activeIndex = computed(() => carousel.index.value)
const activeSlide = computed(() => slides.value[activeIndex.value] ?? slides.value[0]!)
const isMultiple = computed(() => slides.value.length > 1)

// Only the previous, current and next backgrounds are in the DOM: the next one is already loaded when it fades in,
// and a deck of ten photos never loads at once.
const backgroundSlides = computed(() => {
  const count = slides.value.length
  const wanted = new Set([activeIndex.value, (activeIndex.value + 1) % count, (activeIndex.value - 1 + count) % count])
  return slides.value
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide, index }) => slide.layout === 'background' && wanted.has(index))
})

const isDark = computed(() => activeSlide.value.layout === 'background' || activeSlide.value.tone === 'dark')

const toneClasses: Record<HeroTone, string> = {
  primary: 'bg-brand-50 dark:bg-brand-700/20',
  accent: 'bg-accent-50 dark:bg-accent-700/20',
  dark: 'bg-slate-900',
}

// The panel wears the colours of the slide whose text is on screen. It switches when the old text has finished
// fading out (`@after-leave`), not the moment the index changes — otherwise a dark slide's white text would flash
// on the next slide's light panel.
const shownIndex = ref(0)
const shownSlide = computed(() => slides.value[shownIndex.value] ?? slides.value[0]!)
const containerClass = computed(() => (shownSlide.value.layout === 'background' ? 'bg-slate-900' : toneClasses[shownSlide.value.tone]))
function syncShownSlide() {
  shownIndex.value = activeIndex.value
}

function handleSearch(payload: { category: string, province: string, city: string, barangay: string }) {
  emit('search', payload)
}

const searchAnchor = useTemplateRef('searchAnchor')
const { observe } = useHeroSearchDock()
observe(searchAnchor)
</script>

<template>
  <section
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl px-4 pt-9 sm:px-6 lg:px-10"
  >
    <div class="relative">
      <!-- Autoplay pause-on-hover/focus and the arrow keys are decorative enhancements — full manual control
           already exists via the arrow/dot buttons below, so this region intentionally isn't given a fake
           interactive role. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        role="region"
        aria-roledescription="carousel"
        class="relative flex min-h-[420px] items-center overflow-hidden rounded-[32px] px-6 py-12 transition-colors duration-500 sm:px-12 md:min-h-[480px] md:px-16"
        :class="containerClass"
        :aria-label="t('marketplace.hero.regionLabel')"
        @mouseenter="carousel.pause()"
        @mouseleave="carousel.resume()"
        @focusin="carousel.pause()"
        @focusout="carousel.resume()"
        @keydown.left="carousel.prev()"
        @keydown.right="carousel.next()"
      >
        <!-- Full-bleed photo layers (background layout), cross-faded. -->
        <div
          v-for="{ slide, index } in backgroundSlides"
          :key="slide.id"
          class="pointer-events-none absolute inset-0 transition-opacity duration-700"
          :class="index === activeIndex ? 'opacity-100' : 'opacity-0'"
          :aria-hidden="index === activeIndex ? undefined : 'true'"
        >
          <NuxtImg
            v-if="slide.mobileImageUrl"
            :src="slide.mobileImageUrl"
            :alt="slide.imageAlt"
            sizes="100vw"
            width="900"
            height="1200"
            loading="eager"
            class="absolute inset-0 h-full w-full object-cover md:hidden"
            :style="{ objectPosition: `${slide.focalX}% ${slide.focalY}%` }"
          />
          <NuxtImg
            :src="slide.imageUrl!"
            :alt="slide.imageAlt"
            sizes="100vw"
            width="1920"
            height="800"
            :loading="index === 0 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            :preload="index === 0"
            class="absolute inset-0 h-full w-full object-cover"
            :class="slide.mobileImageUrl ? 'hidden md:block' : ''"
            :style="{ objectPosition: `${slide.focalX}% ${slide.focalY}%` }"
          />
          <div
            class="absolute inset-0 bg-black"
            :style="{ opacity: slide.overlay / 100 }"
          />
        </div>

        <Transition
          name="hero-fade"
          mode="out-in"
          @after-leave="syncShownSlide"
        >
          <div
            :key="activeSlide.id"
            class="relative z-10 w-full"
            :class="activeSlide.align === 'center' && activeSlide.layout === 'background' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'"
          >
            <p
              class="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:bg-black/30 dark:text-brand-100"
            >
              <UiIcon
                name="shield-check"
                :size="14"
              />
              {{ activeSlide.eyebrow || trustBadgeText }}
            </p>
            <h1
              class="text-3xl font-bold leading-tight sm:text-4xl md:text-[44px]"
              :class="isDark ? 'text-white' : ''"
            >
              {{ activeSlide.headline }}
            </h1>
            <p
              class="mt-4 max-w-md text-base leading-relaxed md:text-lg"
              :class="[isDark ? 'text-white/80' : 'text-black/60 dark:text-white/60', activeSlide.align === 'center' && activeSlide.layout === 'background' ? 'mx-auto' : '']"
            >
              {{ activeSlide.sub }}
            </p>
            <div
              v-if="activeSlide.ctaUrl || activeSlide.secondaryCtaUrl"
              class="mt-5 flex flex-wrap gap-3"
              :class="activeSlide.align === 'center' && activeSlide.layout === 'background' ? 'justify-center' : ''"
            >
              <CmsLink
                v-if="activeSlide.ctaUrl"
                :to="activeSlide.ctaUrl"
                class="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                {{ cmsText(activeSlide.ctaLabel, t('marketplace.hero.learnMore')) }}
                <UiIcon
                  name="arrow-right"
                  :size="16"
                />
              </CmsLink>
              <CmsLink
                v-if="activeSlide.secondaryCtaUrl"
                :to="activeSlide.secondaryCtaUrl"
                class="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition"
                :class="isDark ? 'border-white/40 text-white hover:bg-white/10' : 'border-black/15 text-black/70 hover:bg-black/5 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/10'"
              >
                {{ cmsText(activeSlide.secondaryCtaLabel, t('marketplace.hero.learnMore')) }}
              </CmsLink>
            </div>
          </div>
        </Transition>

        <!-- Side visual for the split layout: the admin's image, else the icon the design started with. -->
        <div
          v-if="activeSlide.layout === 'split'"
          class="absolute right-16 top-1/2 hidden -translate-y-1/2 items-center justify-center md:flex"
          :class="activeSlide.imageUrl ? 'h-72 w-72 overflow-hidden rounded-3xl shadow-xl shadow-black/10' : 'h-56 w-56 rounded-full bg-white/50 text-brand-700 dark:bg-black/20 dark:text-brand-100'"
        >
          <NuxtImg
            v-if="activeSlide.imageUrl"
            :key="activeSlide.id"
            :src="activeSlide.imageUrl"
            :alt="activeSlide.imageAlt"
            sizes="288px"
            width="288"
            height="288"
            class="h-full w-full object-cover"
            :style="{ objectPosition: `${activeSlide.focalX}% ${activeSlide.focalY}%` }"
          />
          <UiIcon
            v-else
            :name="activeSlide.icon"
            :size="96"
          />
        </div>

        <template v-if="isMultiple">
          <button
            type="button"
            class="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black shadow-md transition hover:bg-white md:flex dark:bg-black/60 dark:text-white dark:hover:bg-black/80"
            :aria-label="t('marketplace.hero.previous')"
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
            class="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black shadow-md transition hover:bg-white md:flex dark:bg-black/60 dark:text-white dark:hover:bg-black/80"
            :aria-label="t('marketplace.hero.next')"
            @click="carousel.next()"
          >
            <UiIcon
              name="arrow-right"
              :size="16"
            />
          </button>
          <div class="absolute bottom-11 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            <button
              v-for="(slide, slideIndex) in slides"
              :key="slide.id"
              type="button"
              class="h-2 rounded-full transition-all"
              :class="slideIndex === activeIndex ? 'w-[22px] bg-brand-600' : isDark ? 'w-2 bg-white/40' : 'w-2 bg-black/15 dark:bg-white/25'"
              :aria-label="t('marketplace.hero.goToSlide', { number: slideIndex + 1 })"
              :aria-current="slideIndex === activeIndex ? 'true' : undefined"
              @click="carousel.goTo(slideIndex)"
            />
          </div>
        </template>
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
          :placeholder="sectionOptionalText(section.settings, 'searchPlaceholder')"
          :submit-label="sectionOptionalText(section.settings, 'searchButtonLabel')"
          class="mx-auto max-w-2xl"
          @submit="handleSearch"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.hero-fade-enter-active,
.hero-fade-leave-active {
  @apply transition-opacity duration-300;
}
.hero-fade-enter-from,
.hero-fade-leave-to {
  @apply opacity-0;
}
</style>
