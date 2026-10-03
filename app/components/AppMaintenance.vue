<script setup lang="ts">
// Auto-imported as <AppMaintenance />. Shown for the whole public site while
// "Maintenance mode" is on in the admin Settings.
const { t } = useI18n()
const { settings } = useSiteSettings()

useSeoMeta({ title: t('maintenance.title'), robots: 'noindex, nofollow' })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
    <AppBrand />
    <h1 class="mt-4 font-display text-3xl font-bold">
      {{ t('maintenance.title') }}
    </h1>
    <p class="max-w-md text-black/60 dark:text-white/60">
      {{ t('maintenance.body', { name: settings.siteName ?? t('brand.name') }) }}
    </p>
    <a
      v-if="settings.contactEmail"
      :href="`mailto:${settings.contactEmail}`"
      class="font-semibold text-brand-700 underline dark:text-brand-500"
    >{{ settings.contactEmail }}</a>
  </div>
</template>
