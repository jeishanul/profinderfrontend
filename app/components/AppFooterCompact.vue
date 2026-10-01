<script setup lang="ts">
// Auto-imported as <AppFooterCompact />. The phone version of the footer: the
// full footer is desktop-only, which left phones with no way to reach the
// legal pages, contact details or social links at all.
const { t } = useI18n()
const { settings } = useSiteSettings()
const year = new Date().getFullYear()

const { data: legalPages } = useApi<{ slug: string, title: string }[]>('/pages', { key: 'footer-pages', lazy: true, default: () => [] })

const socialLinks = computed(() => [
  { label: t('footer.social.facebook'), icon: 'facebook' as IconName, filled: true, href: settings.value.social.facebook },
  { label: t('footer.social.x'), icon: 'x' as IconName, filled: false, href: settings.value.social.x },
  { label: t('footer.social.instagram'), icon: 'instagram' as IconName, filled: false, href: settings.value.social.instagram },
].filter(link => Boolean(link.href)))
</script>

<template>
  <footer class="border-t border-black/10 px-4 py-8 text-center text-sm text-black/60 dark:border-white/10 dark:text-white/60">
    <ul
      v-if="legalPages && legalPages.length > 0"
      class="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2"
    >
      <li
        v-for="page in legalPages"
        :key="page.slug"
      >
        <NuxtLinkLocale
          :to="`/legal/${page.slug}`"
          class="font-semibold underline-offset-2 hover:underline"
        >
          {{ page.title }}
        </NuxtLinkLocale>
      </li>
    </ul>

    <div class="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
      <a
        v-if="settings.contactPhone"
        :href="`tel:${settings.contactPhone}`"
        class="inline-flex items-center gap-1.5"
      >
        <UiIcon
          name="phone"
          :size="14"
        />{{ settings.contactPhone }}
      </a>
      <a
        v-if="settings.contactEmail"
        :href="`mailto:${settings.contactEmail}`"
        class="inline-flex items-center gap-1.5"
      >
        <UiIcon
          name="mail"
          :size="14"
        />{{ settings.contactEmail }}
      </a>
    </div>

    <div
      v-if="socialLinks.length > 0"
      class="mb-4 flex justify-center gap-3"
    >
      <a
        v-for="social in socialLinks"
        :key="social.label"
        :href="social.href!"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="social.label"
        class="flex h-9 w-9 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10"
      >
        <UiIcon
          :name="social.icon"
          :filled="social.filled"
          :size="16"
        />
      </a>
    </div>

    <p class="text-xs">
      {{ t('footer.copyright', { year, name: settings.siteName ?? t('brand.name') }) }}
    </p>
  </footer>
</template>
