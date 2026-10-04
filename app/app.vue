<script setup lang="ts">
// Global i18n SEO wiring: html[lang]/[dir], canonical, hreflang alternates
// (incl. x-default) and og:locale for every route, in every locale — do this
// once here, not per-page. With one locale active there are no alternates to
// emit yet, but this is exactly what makes adding a second locale a config
// change instead of a per-page rework.
// Admin-managed site settings (contact details, social links, branding,
// currency) — fetched once here so every page and component reads the same
// payload (see `useSiteSettings`). A failure falls back to the defaults.
await useApi('/settings', { key: SITE_SETTINGS_KEY })
const { settings } = useSiteSettings()
const route = useRoute()

useSeoMeta({
  titleTemplate: title => (title ? `${title} · ${settings.value.siteName ?? 'ProFinder'}` : (settings.value.siteName ?? 'ProFinder')),
})

// An admin-uploaded favicon overrides the build-time default (see the static
// `<link rel="icon">`s in `nuxt.config.ts`'s `app.head`).
useHead(() => ({
  link: settings.value.faviconUrl ? [{ rel: 'icon', href: settings.value.faviconUrl, key: 'icon' }] : [],
}))

// "Maintenance mode" in the admin Settings: the public site shows a notice
// instead of the app (the legal pages stay readable). 503 tells crawlers it's temporary.
const isUnderMaintenance = computed(() => settings.value.maintenanceMode && !route.path.startsWith('/legal/'))
if (import.meta.server && isUnderMaintenance.value) setResponseStatus(useRequestEvent()!, 503)

const i18nHead = useLocaleHead({ seo: true })
useHead(() => ({
  htmlAttrs: i18nHead.value.htmlAttrs,
  link: i18nHead.value.link,
  meta: i18nHead.value.meta,
}))
</script>

<template>
  <div>
    <NuxtLoadingIndicator />
    <NuxtRouteAnnouncer />
    <AppMaintenance v-if="isUnderMaintenance" />
    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
    <UiToastContainer />
    <UiConfirmDialog />
  </div>
</template>
