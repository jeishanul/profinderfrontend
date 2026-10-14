<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <CmsImageText />. Image beside text (heading, rich body, one button).
const props = defineProps<{
  section: HomeSection
}>()

const imageFirst = computed(() => props.section.settings.imagePosition === 'left')
const hasCta = computed(() => Boolean(props.section.ctaUrl && cmsOptionalText(props.section.ctaLabel)))
</script>

<template>
  <section
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <div
      class="grid items-center gap-10"
      :class="section.imageUrl ? 'lg:grid-cols-2 lg:gap-16' : ''"
    >
      <div :class="imageFirst ? 'lg:order-2' : ''">
        <CmsSectionHeader
          :eyebrow="section.eyebrow"
          :heading="section.heading"
          class="mb-5!"
        />
        <UiRichText :html="section.body" />
        <div
          v-if="hasCta"
          class="mt-6"
        >
          <CmsLink
            :to="section.ctaUrl"
            :class="linkButtonClass('primary')"
          >
            {{ section.ctaLabel }}
          </CmsLink>
        </div>
      </div>
      <div
        v-if="section.imageUrl"
        class="overflow-hidden rounded-3xl shadow-xl shadow-black/10"
        :class="imageFirst ? 'lg:order-1' : ''"
      >
        <NuxtImg
          :src="section.imageUrl"
          :alt="section.imageAlt ?? ''"
          sizes="(min-width: 1024px) 560px, 100vw"
          width="1200"
          height="900"
          loading="lazy"
          class="h-full w-full object-cover"
        />
      </div>
    </div>
  </section>
</template>
