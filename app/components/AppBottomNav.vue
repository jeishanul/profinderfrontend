<script setup lang="ts">
// Auto-imported as <AppBottomNav />. The mobile app-shell tab bar (see
// CLAUDE.md's Phase-1 native-feel redesign notes) — mounted once per layout
// (`layouts/default.vue`, `layouts/dashboard.vue`), hidden at `md` and above
// where the existing header/sidebar nav takes over. Messages/Saved point at
// pages already gated by the `auth` middleware (see `middleware/auth.ts`), so
// an unauthenticated tap gets the same login-modal-then-redirect-home
// behavior as every other protected link in the app — no special-casing here.
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const moreMenu = useMoreMenu()
const bottomNav = useBottomNav()
const { unreadMessages } = useUnreadCounts()

function isActive(path: string) {
  return route.path === localePath(path)
}

const isHidden = computed(() => route.meta.hideBottomNav === true || bottomNav.isForceHidden.value)

const isMoreSection = computed(() => [
  '/dashboard',
  '/purchases',
  '/notifications',
  '/profile',
  '/settings',
  '/clients',
  '/services',
].some(path => isActive(path)))

const tabs = computed(() => [
  { key: 'home', to: '/', icon: 'home' as const, label: t('nav.home') },
  { key: 'browse', to: '/browse', icon: 'search' as const, label: t('nav.browse') },
  { key: 'messages', to: '/messages', icon: 'message' as const, label: t('nav.messages') },
  { key: 'saved', to: '/saved-providers', icon: 'heart' as const, label: t('nav.saved') },
])

function tabClass(active: boolean) {
  return [
    'flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 transition active:scale-90',
    active ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/25 dark:text-brand-100' : 'text-black/50 dark:text-white/50',
  ]
}
</script>

<template>
  <nav
    v-if="!isHidden"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 pb-safe backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-black/90"
    :aria-label="t('nav.more')"
  >
    <div class="mx-auto flex max-w-md items-center justify-around px-1 pt-1.5">
      <NuxtLinkLocale
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        :class="tabClass(isActive(tab.to))"
      >
        <span class="relative">
          <UiIcon
            :name="tab.icon"
            :size="21"
          />
          <span
            v-if="tab.key === 'messages' && unreadMessages > 0"
            class="absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full border border-white bg-accent-600 dark:border-black"
          />
        </span>
        <span
          class="text-[11px]"
          :class="isActive(tab.to) ? 'font-bold' : 'font-medium'"
        >{{ tab.label }}</span>
      </NuxtLinkLocale>

      <button
        type="button"
        :class="tabClass(isMoreSection)"
        @click="moreMenu.open()"
      >
        <UiIcon
          name="more-horizontal"
          :size="21"
        />
        <span
          class="text-[11px]"
          :class="isMoreSection ? 'font-bold' : 'font-medium'"
        >{{ t('nav.more') }}</span>
      </button>
    </div>
  </nav>
</template>
