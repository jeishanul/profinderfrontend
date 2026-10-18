<script setup lang="ts">
// Global i18n SEO wiring: html[lang]/[dir], canonical, hreflang alternates
// (incl. x-default) and og:locale for every route, in every locale — do this
// once here, not per-page. With one locale active there are no alternates to
// emit yet, but this is exactly what makes adding a second locale a config
// change instead of a per-page rework.
// Admin-managed site settings (contact details, social links, branding,
// currency) — fetched once here so every page and component reads the same
// payload (see `useSiteSettings`). A failure falls back to the defaults.
// The header/footer links (see `useNavigation`) load alongside them; a failure falls back to the built-in links.
// The session check the global middleware started joins them, so it costs no extra round trip of its own and the
// header is still right on the first paint.
await Promise.all([
  useApi('/settings', { key: SITE_SETTINGS_KEY }),
  useApi('/navigation', { key: NAVIGATION_KEY }),
  useSession().loadUser(),
])
const { settings } = useSiteSettings()
const route = useRoute()

useSeoMeta({
  titleTemplate: title => (title ? `${title} · ${settings.value.siteName ?? 'ProFinder'}` : (settings.value.siteName ?? 'ProFinder')),
  ogSiteName: () => settings.value.siteName ?? 'ProFinder',
})

// The brand mark (green rounded square + white leaf, see public/favicon.svg): SVG first (crisp at any size), PNG
// fallbacks for contexts without SVG favicons. An admin-uploaded favicon *replaces* all of them — leaving the
// built-in links in place would let the browser pick the old icon.
useHead(() => ({
  link: settings.value.faviconUrl
    ? [
        { rel: 'icon', href: settings.value.faviconUrl, key: 'icon' },
        { rel: 'apple-touch-icon', href: settings.value.faviconUrl, key: 'apple-touch-icon' },
      ]
    : [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg', key: 'icon-svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png', key: 'icon-32' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png', key: 'icon-16' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', key: 'apple-touch-icon' },
      ],
}))

// Re-verify settings on window focus so admin changes in another tab reflect instantly
if (import.meta.client) {
  useEventListener(window, 'focus', () => {
    refreshNuxtData(SITE_SETTINGS_KEY)
  })
}

// The structured data, OG tags and sitemap read the site's name and description from here; without this they would
// stay on the build-time placeholder no matter what the admin set. (Runs in `app.vue` rather than a plugin because
// the settings only arrive after the request above.)
watchEffect(() => updateSiteConfig({
  name: settings.value.siteName ?? undefined,
  description: settings.value.seoDefaultDescription ?? settings.value.siteTagline ?? undefined,
}))

// "Maintenance mode" in the admin Settings: the public site shows a notice
// instead of the app (the legal pages stay readable). 503 tells crawlers it's temporary.
const isUnderMaintenance = computed(() => settings.value.maintenanceMode && !route.path.startsWith('/legal/'))
if (import.meta.server && isUnderMaintenance.value) setResponseStatus(useRequestEvent()!, 503)

// Mounted the first time something asks for confirmation (see `useMountWhenNeeded`), not on every page load.
const confirmDialog = useConfirm()
const confirmDialogMounted = useMountWhenNeeded(() => confirmDialog.state.value.open)

const i18nHead = useLocaleHead({ seo: true })
// A landing page with an admin-set canonical replaces the generated one rather than adding a second tag.
const canonicalOverride = useCanonicalOverride()
useHead(() => ({
  htmlAttrs: i18nHead.value.htmlAttrs,
  link: canonicalOverride.value
    ? [...i18nHead.value.link.filter(link => link.rel !== 'canonical'), { rel: 'canonical', href: canonicalOverride.value.url, key: 'canonical' }]
    : i18nHead.value.link,
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
    <LazyUiConfirmDialog v-if="confirmDialogMounted" />
  </div>
</template>
