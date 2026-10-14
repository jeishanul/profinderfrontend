<script setup lang="ts">
// Auto-imported as <MarketplaceQuickTiles />. Mobile-only, logged-in-only quick-tap row (see CLAUDE.md's native-feel
// redesign notes) — one-tap access to the destinations that don't have a bottom-nav tab of their own, without
// touching the marketing content (hero, trust stats, etc.) that anonymous/SEO traffic still needs to see.
const { t } = useI18n()
const session = useSession()
const { unreadNotifications } = useUnreadCounts()

const quickTiles = computed(() => [
  { to: '/dashboard', icon: 'grid' as const, tint: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100', label: t('dashboard.sidebar.dashboard') },
  { to: '/purchases', icon: 'bag' as const, tint: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100', label: t('dashboard.sidebar.myPurchases') },
  { to: '/notifications', icon: 'bell' as const, tint: 'bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70', label: t('dashboard.sidebar.notifications') },
  { to: '/settings', icon: 'gear' as const, tint: 'bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70', label: t('dashboard.sidebar.settings') },
])
</script>

<template>
  <div
    v-if="session.isAuthenticated.value"
    class="mx-auto grid max-w-6xl grid-cols-4 gap-3 px-4 pt-6 pb-1 sm:px-6 md:hidden"
  >
    <NuxtLinkLocale
      v-for="tile in quickTiles"
      :key="tile.to"
      :to="tile.to"
      class="flex flex-col items-center gap-1.5"
    >
      <span
        class="relative flex h-14 w-14 items-center justify-center rounded-2xl"
        :class="tile.tint"
      >
        <UiIcon
          :name="tile.icon"
          :size="21"
        />
        <span
          v-if="tile.to === '/notifications' && unreadNotifications > 0"
          class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white"
        >{{ formatBadgeCount(unreadNotifications) }}</span>
      </span>
      <span class="text-center text-[11px] font-semibold text-black/70 dark:text-white/70">{{ tile.label }}</span>
    </NuxtLinkLocale>
  </div>
</template>
