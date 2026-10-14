<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <MarketplaceDownloadAppSection />.
const props = defineProps<{
  section: HomeSection
}>()

const { t } = useI18n()
const { settings } = useSiteSettings()
const requestUrl = useRequestURL()

// Nothing to download without at least one store link — showing the pitch
// and a QR code that just opens the website was misleading.
const hasAppLink = computed(() => Boolean(settings.value.appStoreUrl || settings.value.playStoreUrl))
const qrTarget = computed(() => settings.value.appStoreUrl ?? settings.value.playStoreUrl ?? requestUrl.origin)

// The promo copy and the phone screenshot are the section's own fields (set in the admin); the built-in copy and a
// placeholder fill in until then. The store links themselves come from the site settings.
const heading = computed(() => cmsText(props.section.heading, t('marketplace.downloadApp.heading')))
const phoneImage = computed(() => props.section.imageUrl)

const helplineHeading = computed(() => (settings.value.supportHours
  ? t('marketplace.downloadApp.helpline.headingWithHours', { hours: settings.value.supportHours })
  : t('marketplace.downloadApp.helpline.heading')))
</script>

<template>
  <section
    :id="sectionAnchor(section)"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <div
      v-if="hasAppLink"
      class="relative grid items-center gap-12 overflow-hidden lg:grid-cols-[400px_minmax(0,1fr)]"
      :class="section.backgroundImageUrl ? 'rounded-3xl p-6 sm:p-10' : ''"
    >
      <!-- Optional admin background: kept behind a strong neutral wash so the text stays readable in both themes. -->
      <template v-if="section.backgroundImageUrl">
        <NuxtImg
          :src="section.backgroundImageUrl"
          alt=""
          sizes="100vw"
          width="1200"
          height="600"
          loading="lazy"
          class="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div class="pointer-events-none absolute inset-0 bg-white/85 dark:bg-black/75" />
      </template>
      <div class="relative z-10 mx-auto h-[360px] w-[220px]">
        <div class="h-full w-full overflow-hidden rounded-[28px] bg-black/90 p-2 shadow-2xl">
          <div class="h-full w-full overflow-hidden rounded-[20px]">
            <NuxtImg
              v-if="phoneImage"
              :src="phoneImage"
              :alt="cmsText(section.imageAlt, heading)"
              width="204"
              height="344"
              class="h-full w-full object-cover"
            />
            <UiPlaceholderMedia
              v-else
              icon="image"
              class="h-full"
            />
          </div>
        </div>
        <div class="absolute -left-14 top-8">
          <MarketplaceAppStoreBadges />
        </div>
      </div>

      <div class="relative z-10">
        <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
          <span class="inline-block h-px w-6 bg-black/40 dark:bg-white/40" />
          {{ cmsText(section.eyebrow, t('marketplace.downloadApp.eyebrow')) }}
        </div>
        <h2 class="font-display text-3xl font-bold sm:text-4xl">
          {{ heading }}
        </h2>
        <UiRichText
          v-if="section.body"
          :html="section.body"
          class="mt-3.5 max-w-md"
        />
        <p
          v-else
          class="mt-3.5 max-w-md text-black/60 dark:text-white/60"
        >
          {{ t('marketplace.downloadApp.description') }}
        </p>

        <div class="mt-6 flex items-center gap-4">
          <UiQrCode
            :value="qrTarget"
            :size="72"
            :label="t('marketplace.downloadApp.qrHint')"
          />
          <p class="max-w-[220px] text-sm text-black/60 dark:text-white/60">
            {{ t('marketplace.downloadApp.qrHint') }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="settings.contactPhone || settings.contactEmail"
      :class="hasAppLink ? 'mt-16' : ''"
      class="flex flex-col items-center justify-between gap-6 rounded-3xl border border-black/10 bg-white/70 p-9 backdrop-blur-xl dark:border-white/10 dark:bg-black/30 sm:flex-row"
    >
      <div>
        <p class="text-lg font-bold">
          {{ helplineHeading }}
        </p>
        <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
          {{ t('marketplace.downloadApp.helpline.description') }}
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap justify-center gap-2.5">
        <a
          v-if="settings.contactPhone"
          :href="`tel:${settings.contactPhone}`"
          class="inline-flex items-center gap-2 rounded-md bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-700/20 dark:text-brand-100 dark:hover:bg-brand-700/30"
        >
          <UiIcon
            name="phone"
            :size="15"
          />
          {{ settings.contactPhone }}
        </a>
        <a
          v-if="settings.contactEmail"
          :href="`mailto:${settings.contactEmail}`"
          class="inline-flex items-center gap-2 rounded-md bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-700/20 dark:text-brand-100 dark:hover:bg-brand-700/30"
        >
          <UiIcon
            name="mail"
            :size="15"
          />
          {{ settings.contactEmail }}
        </a>
        <NuxtLinkLocale
          to="/browse"
          :class="linkButtonClass('primary')"
        >
          {{ t('marketplace.downloadApp.helpline.requestService') }}
        </NuxtLinkLocale>
      </div>
    </div>
  </section>
</template>
