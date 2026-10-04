<script setup lang="ts">
// Auto-imported as <MarketplaceAppStoreBadges />. Generic (non-trademarked)
// badge styling — text-labelled rather than reproducing Apple/Google's
// registered badge artwork. The links are the admin's Settings; a store with
// no link set isn't shown (a dead "#" badge is worse than none).
withDefaults(
  defineProps<{
    tone?: 'light' | 'dark'
  }>(),
  { tone: 'light' },
)

const { t } = useI18n()
const { settings } = useSiteSettings()

const stores = computed(() => [
  { key: 'googlePlay', href: settings.value.playStoreUrl },
  { key: 'appStore', href: settings.value.appStoreUrl },
].filter(store => Boolean(store.href)))
</script>

<template>
  <div
    v-if="stores.length > 0"
    class="flex flex-col gap-2.5"
  >
    <a
      v-for="store in stores"
      :key="store.key"
      :href="store.href!"
      target="_blank"
      rel="noopener noreferrer"
      class="flex h-[38px] w-[134px] items-center justify-center gap-2 rounded-lg text-xs font-bold"
      :class="tone === 'light'
        ? 'border border-black/10 bg-white text-black'
        : 'bg-white/10 text-white'"
    >
      <UiIcon
        name="smartphone"
        :size="15"
      />
      {{ t(`marketplace.downloadApp.${store.key}`) }}
    </a>
  </div>
</template>
