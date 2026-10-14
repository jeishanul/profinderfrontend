<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <MarketplaceWhyChooseUs />.
const props = defineProps<{
  section: HomeSection
}>()

const { t } = useI18n()

const FALLBACK: Array<{ id: string, icon: IconName, tone: 'primary' | 'accent' }> = [
  { id: 'verified', icon: 'shield-check', tone: 'primary' },
  { id: 'support', icon: 'phone', tone: 'accent' },
  { id: 'payments', icon: 'lock', tone: 'primary' },
  { id: 'reviews', icon: 'star', tone: 'accent' },
]

// The admin's points, else the built-in four.
const reasons = computed(() => props.section.items.length > 0
  ? props.section.items.map((item, index) => ({
      id: `cms-${index}`,
      icon: knownIcon(item.icon, FALLBACK[index % FALLBACK.length]!.icon),
      tone: (index % 2 === 0 ? 'primary' : 'accent') as 'primary' | 'accent',
      label: item.title ?? '',
    }))
  : FALLBACK.map(reason => ({ ...reason, label: t(`marketplace.whyChooseUs.reasons.${reason.id}`) })))

// The section's own photo (set in the admin), else a placeholder.
const featuredImage = computed(() => props.section.imageUrl)
const featuredImageAlt = computed(() => cmsText(props.section.imageAlt, cmsText(props.section.heading, t('marketplace.whyChooseUs.heading'))))
const hasCta = computed(() => Boolean(props.section.ctaUrl && cmsOptionalText(props.section.ctaLabel)))

const toneClasses: Record<'primary' | 'accent', string> = {
  primary: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  accent: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
}
</script>

<template>
  <section
    :id="sectionAnchor(section, 'why-choose-us')"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <div class="mb-9 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
      <span class="inline-block h-px w-6 bg-black/40 dark:bg-white/40" />
      {{ cmsText(section.eyebrow, t('marketplace.whyChooseUs.eyebrow')) }}
    </div>
    <h2
      class="max-w-xl font-display text-3xl font-bold sm:text-4xl"
      :class="section.subheading ? 'mb-3' : 'mb-9'"
    >
      {{ cmsText(section.heading, t('marketplace.whyChooseUs.heading')) }}
    </h2>
    <p
      v-if="section.subheading"
      class="mb-9 max-w-2xl text-black/60 dark:text-white/60"
    >
      {{ section.subheading }}
    </p>

    <div class="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="reason in reasons"
          :key="reason.id"
          class="rounded-2xl border border-black/10 bg-white/70 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-black/30"
        >
          <div
            class="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl"
            :class="toneClasses[reason.tone]"
          >
            <UiIcon
              :name="reason.icon"
              :filled="reason.icon === 'star'"
              :size="20"
            />
          </div>
          <p class="font-semibold">
            {{ reason.label }}
          </p>
        </div>
      </div>

      <div class="relative min-h-64 overflow-hidden rounded-3xl">
        <NuxtImg
          v-if="featuredImage"
          :src="featuredImage"
          :alt="featuredImageAlt"
          width="560"
          height="380"
          class="h-full w-full object-cover"
        />
        <UiPlaceholderMedia
          v-else
          icon="user"
          tone="accent"
        />
        <div class="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 py-4 text-sm font-bold text-white">
          <UiIcon
            name="shield-check"
            :size="16"
          />
          {{ sectionText(section.settings, 'bannerText', t('marketplace.whyChooseUs.trustGuarantee')) }}
        </div>
      </div>
    </div>
    <UiRichText
      :html="section.body"
      class="mt-6 max-w-2xl"
    />
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
  </section>
</template>
