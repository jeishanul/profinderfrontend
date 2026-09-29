<script setup lang="ts">
// Auto-imported as <UiBackButton />. Mobile-only (`md:hidden`) — pairs with
// a page's `definePageMeta({ hideBottomNav: true })` (see `app/app.d.ts`):
// drill-down panel pages (Dashboard, Purchases, Notifications, Profile,
// Settings, Clients, Services — reached from Home's quick tiles or the
// More sheet, never a bottom-nav tab) drop this at the top of their own
// template instead of the tab bar, matching native push-navigation. Real
// browser history first (works whether the visit came from Home, More, or
// a deep link) — `fallback` only matters when there's no history to pop to
// (e.g. opened directly).
const props = withDefaults(defineProps<{ fallback?: string }>(), { fallback: '/' })

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

function goBack() {
  if (window.history.length > 1) router.back()
  else navigateTo(localePath(props.fallback))
}
</script>

<template>
  <button
    type="button"
    class="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 transition active:scale-90 md:hidden dark:border-white/10"
    :aria-label="t('marketplace.search.back')"
    @click="goBack"
  >
    <UiIcon
      name="chevron-left"
      :size="17"
    />
  </button>
</template>
