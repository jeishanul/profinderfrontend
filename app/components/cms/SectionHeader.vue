<script setup lang="ts">
// Auto-imported as <CmsSectionHeader />. The eyebrow / heading / subheading block that opens a section.
withDefaults(
  defineProps<{
    eyebrow?: string | null
    heading?: string | null
    subheading?: string | null
    align?: 'left' | 'center'
  }>(),
  { eyebrow: null, heading: null, subheading: null, align: 'left' },
)
</script>

<template>
  <div
    v-if="eyebrow || heading || subheading"
    class="mb-9"
    :class="align === 'center' ? 'text-center' : ''"
  >
    <div
      v-if="eyebrow"
      class="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50"
      :class="align === 'center' ? 'justify-center' : ''"
    >
      <span class="inline-block h-px w-6 bg-black/40 dark:bg-white/40" />
      {{ eyebrow }}
    </div>
    <h2
      v-if="heading"
      class="font-display text-3xl font-bold sm:text-4xl"
    >
      {{ heading }}
    </h2>
    <p
      v-if="subheading"
      class="mt-2.5 text-black/60 dark:text-white/60"
    >
      {{ subheading }}
    </p>
  </div>
</template>
