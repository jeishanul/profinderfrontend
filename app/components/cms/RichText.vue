<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <CmsRichText />. A heading and a block of formatted text.
defineProps<{
  section: HomeSection
}>()
</script>

<template>
  <section
    v-if="section.heading || section.body"
    :id="sectionAnchor(section)"
    class="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <h2
      v-if="section.heading"
      class="mb-5 font-display text-3xl font-bold sm:text-4xl"
    >
      {{ section.heading }}
    </h2>
    <UiRichText :html="section.body" />
  </section>
</template>
