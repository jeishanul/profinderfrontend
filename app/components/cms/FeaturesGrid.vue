<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <CmsFeaturesGrid />. Cards with an icon or image, a title, a line of text and an optional link.
const props = defineProps<{
  section: HomeSection
}>()

const CmsLink = resolveComponent('CmsLink')

const COLUMN_CLASSES: Record<string, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}
const columnClass = computed(() => COLUMN_CLASSES[String(props.section.settings.columns)] ?? COLUMN_CLASSES['3'])
</script>

<template>
  <section
    v-if="section.items.length > 0"
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <CmsSectionHeader
      :eyebrow="section.eyebrow"
      :heading="section.heading"
      :subheading="section.subheading"
    />
    <div
      class="grid gap-5"
      :class="columnClass"
    >
      <component
        :is="item.linkUrl ? CmsLink : 'div'"
        v-for="(item, index) in section.items"
        :key="index"
        :to="item.linkUrl ?? undefined"
        class="block overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black/30"
        :class="item.linkUrl ? 'transition-shadow hover:shadow-lg' : ''"
      >
        <NuxtImg
          v-if="item.imageUrl"
          :src="item.imageUrl"
          :alt="item.imageAlt ?? ''"
          sizes="(min-width: 1024px) 380px, 100vw"
          width="800"
          height="600"
          loading="lazy"
          class="aspect-[4/3] w-full object-cover"
        />
        <div class="p-6">
          <div
            v-if="!item.imageUrl && item.icon"
            class="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100"
          >
            <UiIcon
              :name="knownIcon(item.icon, 'star')"
              :size="20"
            />
          </div>
          <h3 class="text-lg font-bold">
            {{ item.title }}
          </h3>
          <p
            v-if="item.description"
            class="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60"
          >
            {{ item.description }}
          </p>
        </div>
      </component>
    </div>
  </section>
</template>
