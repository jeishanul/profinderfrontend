<script setup lang="ts">
// Auto-imported as <MarketplaceScrollHintArrow />. Home-page only — invites
// the visitor to keep scrolling toward "Why Choose Us"
// (`app/components/marketplace/WhyChooseUs.vue`, `id="why-choose-us"`), and
// hides itself once that section has been reached or scrolled past.
//
// Its `bottom` offset clears `<AppBottomNav>` on mobile (both are `fixed`;
// at the same `bottom-8` they visibly overlapped, this pill half-buried
// behind the tab bar — a real bug, confirmed by comparing their bounding
// boxes) and sits below it in stacking order too (`z-30` vs. the nav's
// `z-40`) as a second line of defense. `md:bottom-8` restores the original
// position once the bottom nav itself is hidden at that breakpoint.
const { t } = useI18n()

const visible = ref(true)

function updateVisibility() {
  const target = document.getElementById('why-choose-us')
  if (!target) return
  visible.value = target.getBoundingClientRect().top > 0
}

function scrollToTarget() {
  document.getElementById('why-choose-us')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

if (import.meta.client) {
  useEventListener(window, 'scroll', updateVisibility, { passive: true })
  onMounted(updateVisibility)
}
</script>

<template>
  <Transition name="hint-fade">
    <button
      v-if="visible"
      type="button"
      class="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-black/10 bg-white py-1.5 pr-1.5 pl-5 text-sm font-semibold text-black shadow-lg transition-shadow hover:shadow-xl md:bottom-8 dark:border-white/10 dark:bg-black dark:text-white"
      :aria-label="t('marketplace.whyChooseUs.scrollHint')"
      @click="scrollToTarget"
    >
      {{ t('marketplace.whyChooseUs.scrollHintLabel') }}
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
        <UiIcon
          name="chevron-down"
          :size="18"
        />
      </span>
    </button>
  </Transition>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.hint-fade-enter-active,
.hint-fade-leave-active {
  @apply transition-all duration-300;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  @apply translate-y-2 opacity-0;
}
</style>
