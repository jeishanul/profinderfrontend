<script setup lang="ts">
// Auto-imported as <AppBrand />. The logo + name used in the header, the
// dashboard sidebar and the footer. Shows the logo uploaded in the admin's
// Settings (with a separate dark-mode logo if one is set), else the default
// leaf mark; the name always follows the "site name" setting.
withDefaults(
  defineProps<{
    size?: 'md' | 'sm'
    /** Text colour classes for the name (the footer sits on a dark background). */
    textClass?: string
  }>(),
  { size: 'md', textClass: '' },
)

const { t } = useI18n()
const { settings } = useSiteSettings()

const name = computed(() => settings.value.siteName ?? t('brand.name'))
</script>

<template>
  <span class="flex items-center gap-2.5">
    <template v-if="settings.logoUrl">
      <!-- Requested at the height it's shown (1x and 2x), not the uploaded original. The dark-mode logo is lazy:
           a hidden lazy image isn't downloaded, so light-mode visitors never fetch it. -->
      <NuxtImg
        :src="settings.logoUrl"
        :alt="name"
        :height="size === 'md' ? 40 : 36"
        densities="x1 x2"
        class="w-auto"
        :class="[size === 'md' ? 'h-10' : 'h-9', settings.logoDarkUrl ? 'dark:hidden' : '']"
      />
      <NuxtImg
        v-if="settings.logoDarkUrl"
        :src="settings.logoDarkUrl"
        :alt="name"
        :height="size === 'md' ? 40 : 36"
        densities="x1 x2"
        loading="lazy"
        class="hidden w-auto dark:block"
        :class="size === 'md' ? 'h-10' : 'h-9'"
      />
    </template>
    <template v-else>
      <span
        class="flex items-center justify-center bg-brand-600 text-white"
        :class="size === 'md' ? 'h-10 w-10 rounded-2xl' : 'h-9 w-9 rounded-xl'"
      >
        <UiIcon
          name="leaf"
          :size="size === 'md' ? 22 : 19"
        />
      </span>
      <span
        :class="[size === 'md' ? 'text-xl' : 'text-lg', textClass]"
      >{{ name }}</span>
    </template>
  </span>
</template>
