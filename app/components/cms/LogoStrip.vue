<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <CmsLogoStrip />. A row of partner / press / client logos.
defineProps<{
  section: HomeSection
}>()

const CmsLink = resolveComponent('CmsLink')
</script>

<template>
  <section
    v-if="section.items.some(item => item.imageUrl)"
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-10"
  >
    <p
      v-if="section.heading"
      class="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-black/50 dark:text-white/50"
    >
      {{ section.heading }}
    </p>
    <ul class="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
      <li
        v-for="(item, index) in section.items.filter(entry => entry.imageUrl)"
        :key="index"
      >
        <component
          :is="item.linkUrl ? CmsLink : 'span'"
          :to="item.linkUrl ?? undefined"
          class="block opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
        >
          <NuxtImg
            :src="item.imageUrl!"
            :alt="item.imageAlt ?? item.title ?? ''"
            sizes="160px"
            width="160"
            height="56"
            loading="lazy"
            class="h-10 w-auto max-w-40 object-contain sm:h-12"
          />
        </component>
      </li>
    </ul>
  </section>
</template>
