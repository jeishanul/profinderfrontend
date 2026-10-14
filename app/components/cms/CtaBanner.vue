<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <CmsCtaBanner />. A full-width call to action over a colour or a background photo.
const props = defineProps<{
  section: HomeSection
}>()

const TONES: Record<string, string> = {
  primary: 'bg-brand-700',
  accent: 'bg-accent-600',
  dark: 'bg-slate-900',
}
const toneClass = computed(() => TONES[String(props.section.settings.tone)] ?? TONES.primary)
const hasCta = computed(() => Boolean(props.section.ctaUrl && cmsOptionalText(props.section.ctaLabel)))
</script>

<template>
  <section
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-10"
  >
    <div
      class="relative overflow-hidden rounded-3xl px-6 py-14 text-center text-white sm:px-12"
      :class="toneClass"
    >
      <template v-if="section.backgroundImageUrl">
        <NuxtImg
          :src="section.backgroundImageUrl"
          :alt="section.imageAlt ?? ''"
          sizes="100vw"
          width="1920"
          height="600"
          loading="lazy"
          class="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div class="pointer-events-none absolute inset-0 bg-black/55" />
      </template>
      <div class="relative mx-auto max-w-2xl">
        <h2
          v-if="section.heading"
          class="font-display text-3xl font-bold sm:text-4xl"
        >
          {{ section.heading }}
        </h2>
        <p
          v-if="section.subheading"
          class="mt-3 text-lg text-white/85"
        >
          {{ section.subheading }}
        </p>
        <CmsLink
          v-if="hasCta"
          :to="section.ctaUrl"
          class="mt-7 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-800 transition hover:bg-brand-50"
        >
          {{ section.ctaLabel }}
        </CmsLink>
      </div>
    </div>
  </section>
</template>
