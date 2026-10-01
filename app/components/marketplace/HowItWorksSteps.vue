<script setup lang="ts">
// Auto-imported as <MarketplaceHowItWorksSteps />. As the user scrolls past
// each step, `useScrollSpy` reports which one is active and the sticky visual
// on the left swaps to match.
const { t } = useI18n()

const FALLBACK_IDS = ['request', 'compare', 'book', 'review'] as const
const STEP_ICONS: IconName[] = ['search', 'calendar', 'lock', 'star']

// The admin's steps, else the built-in four.
const content = useContentSection('how_it_works')
const steps = computed(() => content.value.length > 0
  ? content.value.map((item, index) => ({
      id: `cms-${index}`,
      icon: knownIcon(item.icon, STEP_ICONS[index % STEP_ICONS.length]!),
      title: item.title ?? '',
      description: item.description ?? '',
    }))
  : FALLBACK_IDS.map((id, index) => ({
      id,
      icon: STEP_ICONS[index]!,
      title: t(`marketplace.howItWorks.steps.${id}.title`),
      description: t(`marketplace.howItWorks.steps.${id}.description`),
    })))

const stepRefs = ref<Array<HTMLElement | null>>([])
const { activeIndex, recalculate } = useScrollSpy(stepRefs)

function setStepRef(el: Element | ComponentPublicInstance | null, index: number) {
  stepRefs.value[index] = el instanceof HTMLElement ? el : null
}

function goToStep(index: number) {
  stepRefs.value[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

onMounted(recalculate)
</script>

<template>
  <section
    id="how-it-works"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <div class="mb-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
      <span class="inline-block h-px w-6 bg-black/40 dark:bg-white/40" />
      {{ t('marketplace.howItWorks.eyebrow') }}
    </div>
    <h2 class="mb-10 font-display text-3xl font-bold sm:text-4xl">
      {{ t('marketplace.howItWorks.heading') }}
    </h2>

    <div class="grid gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-16">
      <div class="sticky top-28 hidden self-start lg:block">
        <div class="relative flex h-[420px] w-full items-center justify-center overflow-hidden rounded-[26px] bg-brand-50 text-brand-700 shadow-xl shadow-black/10 dark:bg-brand-700/20 dark:text-brand-100">
          <Transition
            name="fade"
            mode="out-in"
          >
            <UiIcon
              :key="steps[activeIndex]?.id"
              :name="steps[activeIndex]?.icon ?? 'search'"
              :size="72"
            />
          </Transition>
          <span class="pointer-events-none absolute bottom-6 left-6 font-display text-6xl font-bold opacity-20">
            {{ activeIndex + 1 }}
          </span>
        </div>
      </div>

      <div class="flex flex-col">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          :ref="(el) => setStepRef(el, index)"
          type="button"
          class="w-full appearance-none border-0 bg-transparent py-5 text-left transition-opacity duration-300"
          :class="index === activeIndex ? 'opacity-100' : 'opacity-40'"
          @click="goToStep(index)"
        >
          <div class="flex items-start gap-5">
            <div
              class="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full font-display text-lg font-bold transition-colors"
              :class="index === activeIndex ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'"
            >
              {{ index + 1 }}
            </div>
            <div>
              <h3 class="text-xl font-bold">
                {{ step.title }}
              </h3>
              <p class="mt-2 max-w-md text-black/60 dark:text-white/60">
                {{ step.description }}
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.fade-enter-active,
.fade-leave-active {
  @apply transition-opacity duration-300;
}
.fade-enter-from,
.fade-leave-to {
  @apply opacity-0;
}
</style>
