<script setup lang="ts">
// Auto-imported as <AppFooterCompact />. The phone version of the footer: the
// full footer is desktop-only, which left phones with no way to reach the
// legal pages, contact details or social links at all.
const { settings } = useSiteSettings()
const { navigation, viewer } = useNavigation()
const { copyright } = useFooterText()

// The bottom links plus the page lists (legal pages and the like); the footer's other columns stay desktop-only.
const links = computed(() => compactFooterLinks(navigation.value, viewer.value))
</script>

<template>
  <footer class="border-t border-black/10 px-4 py-8 text-center text-sm text-black/60 dark:border-white/10 dark:text-white/60">
    <ul
      v-if="links.length > 0"
      class="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2"
    >
      <li
        v-for="link in links"
        :key="`${link.url}|${link.label}`"
      >
        <CmsLink
          :to="link.url"
          :new-tab="link.newTab"
          class="font-semibold underline-offset-2 hover:underline"
        >
          {{ link.label }}
        </CmsLink>
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
      v-if="navigation.social.length > 0"
      class="mb-4 flex flex-wrap justify-center gap-3"
    >
      <a
        v-for="social in navigation.social"
        :key="social.network"
        :href="social.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="social.label"
        class="flex h-9 w-9 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10"
      >
        <UiIcon
          :name="socialIconName(social.network)"
          :filled="socialIconFilled(social.network)"
          :size="16"
        />
      </a>
    </div>

    <p class="text-xs">
      {{ copyright }}
    </p>
  </footer>
</template>
