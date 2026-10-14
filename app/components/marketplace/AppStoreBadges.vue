<script setup lang="ts">
// Auto-imported as <MarketplaceAppStoreBadges />. Generic (non-trademarked)
// text-labelled badges unless the admin uploaded the store's own badge image
// (Settings), which then replaces that store's text badge. The links are the
// admin's Settings; a store with no link set isn't shown (a dead "#" badge is
// worse than none).
withDefaults(
  defineProps<{
    tone?: 'light' | 'dark'
  }>(),
  { tone: 'light' },
)

const { t } = useI18n()
const { settings } = useSiteSettings()

const stores = computed(() => [
  { key: 'googlePlay', href: settings.value.playStoreUrl, badge: settings.value.playStoreBadgeUrl },
  { key: 'appStore', href: settings.value.appStoreUrl, badge: settings.value.appStoreBadgeUrl },
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
      :aria-label="store.badge ? t(`marketplace.downloadApp.${store.key}`) : undefined"
      class="flex h-[38px] items-center justify-center gap-2 text-xs font-bold"
      :class="store.badge
        ? 'w-auto'
        : ['w-[134px] rounded-lg', tone === 'light' ? 'border border-black/10 bg-white text-black' : 'bg-white/10 text-white']"
    >
      <NuxtImg
        v-if="store.badge"
        :src="store.badge"
        :alt="t(`marketplace.downloadApp.${store.key}`)"
        height="38"
        class="h-[38px] w-auto"
      />
      <template v-else>
        <UiIcon
          name="smartphone"
          :size="15"
        />
        {{ t(`marketplace.downloadApp.${store.key}`) }}
      </template>
    </a>
  </div>
</template>
