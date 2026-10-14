<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <CmsImageGallery />. A responsive grid of photos with optional captions and links.
defineProps<{
  section: HomeSection
}>()

const CmsLink = resolveComponent('CmsLink')
</script>

<template>
  <section
    v-if="section.items.some(item => item.imageUrl)"
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <CmsSectionHeader
      :heading="section.heading"
      :subheading="section.subheading"
    />
    <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      <component
        :is="item.linkUrl ? CmsLink : 'figure'"
        v-for="(item, index) in section.items.filter(entry => entry.imageUrl)"
        :key="index"
        :to="item.linkUrl ?? undefined"
        class="block overflow-hidden rounded-2xl"
      >
        <NuxtImg
          :src="item.imageUrl!"
          :alt="item.imageAlt ?? item.title ?? ''"
          sizes="(min-width: 1024px) 280px, 50vw"
          width="800"
          height="600"
          loading="lazy"
          class="aspect-[4/3] w-full object-cover"
        />
        <span
          v-if="item.title"
          class="mt-2 block text-sm font-semibold"
        >{{ item.title }}</span>
      </component>
    </div>
  </section>
</template>
