<script setup lang="ts">
import type { FaqItem } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceFaqAccordion />.
const props = defineProps<{
  items: FaqItem[]
}>()

const { t } = useI18n()

const INITIAL_VISIBLE = 6
const showAll = ref(false)
const visibleItems = computed(() => (showAll.value ? props.items : props.items.slice(0, INITIAL_VISIBLE)))

const openId = ref<string | null>(props.items[0]?.id ?? null)

function toggle(id: string) {
  openId.value = openId.value === id ? null : id
}
</script>

<template>
  <section
    v-if="items.length > 0"
    class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10"
  >
    <div class="mb-11 text-center">
      <h2 class="font-display text-3xl font-bold sm:text-4xl">
        {{ t('marketplace.faq.heading') }}
      </h2>
      <p class="mt-2.5 text-black/60 dark:text-white/60">
        {{ t('marketplace.faq.subheading') }}
      </p>
    </div>

    <div class="flex flex-col gap-3">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="rounded-2xl border border-black/10 bg-white/70 px-6 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/30"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 text-left font-bold"
          :aria-expanded="openId === item.id"
          @click="toggle(item.id)"
        >
          <span>{{ item.question }}</span>
          <UiIcon
            name="chevron-down"
            :size="18"
            class="shrink-0 text-brand-700 transition-transform duration-300"
            :class="openId === item.id ? 'rotate-180' : ''"
          />
        </button>
        <div
          class="grid overflow-hidden text-sm text-black/60 transition-all duration-300 dark:text-white/60"
          :class="openId === item.id ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
        >
          <p class="min-h-0 leading-relaxed whitespace-pre-line">
            {{ item.answer }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="items.length > INITIAL_VISIBLE"
      class="mt-7 flex justify-center"
    >
      <UiButton
        variant="ghost"
        @click="showAll = !showAll"
      >
        {{ showAll ? t('marketplace.faq.showFewer') : t('marketplace.faq.showMore') }}
      </UiButton>
    </div>
  </section>
</template>
