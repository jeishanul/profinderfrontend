<script setup lang="ts">
import type { SeoFaq } from '#shared/types/seo'

// Auto-imported as <MarketplaceSeoFaq />. Admin-curated per landing page; sits below the SEO footer content.
const props = defineProps<{
  items: SeoFaq[]
}>()

const { t } = useI18n()

const openIndex = ref<number | null>(props.items.length > 0 ? 0 : null)

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index
}

// Every answer is in the HTML (collapsed, not removed), so the FAQPage structured data matches visible content.
if (props.items.length > 0) {
  useSchemaOrg([
    defineWebPage({ '@type': ['WebPage', 'FAQPage'] }),
    ...props.items.map(item => defineQuestion({ name: item.question, acceptedAnswer: item.answer })),
  ])
}
</script>

<template>
  <section
    v-if="items.length > 0"
    class="mt-8"
  >
    <h2 class="mb-4 font-display text-xl font-bold sm:text-2xl">
      {{ t('seo.faq.heading') }}
    </h2>
    <div class="flex flex-col gap-3">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="rounded-2xl border border-black/10 bg-white/70 px-6 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/30"
      >
        <h3>
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 text-left font-bold"
            :aria-expanded="openIndex === index"
            @click="toggle(index)"
          >
            <span>{{ item.question }}</span>
            <UiIcon
              name="chevron-down"
              :size="18"
              class="shrink-0 text-brand-700 transition-transform duration-300"
              :class="openIndex === index ? 'rotate-180' : ''"
            />
          </button>
        </h3>
        <div
          class="grid overflow-hidden text-sm text-black/60 transition-all duration-300 dark:text-white/60"
          :class="openIndex === index ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
        >
          <p class="min-h-0 leading-relaxed whitespace-pre-line">
            {{ item.answer }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
