<script setup lang="ts">
// Shared chrome for every logged-in panel page (this `dashboard` layout,
// not the URL — each page below sets its own top-level route, e.g. /profile,
// /messages): sidebar navigation (desktop) / horizontal nav (mobile), and a
// topbar with the provider/consumer role switch, theme toggle and logout.
// Provider-only nav (My profile/Verification, My Services, Clients Served)
// and consumer-only nav (My Purchases, Saved Providers) show/hide based on
// `session.activeRole` — Dashboard, Messages, Notifications, Browse Services,
// Settings and Log out stay reachable in both modes (see
// `DashboardDualRoleBanner` for why Browse specifically can't be optional).
const { t } = useI18n()
const session = useSession()
const route = useRoute()
const localePath = useLocalePath()
// Drop the bottom clearance meant for `<AppBottomNav>` on mobile whenever a
// page has hidden it (a whole route via `hideBottomNav` page meta, or a
// state change like `messages.vue`'s thread view via `useBottomNav`) — else
// it leaves a dead gap where the bar used to reserve space.
const bottomNav = useBottomNav()
const bottomNavHidden = computed(() => route.meta.hideBottomNav === true || bottomNav.isForceHidden.value)

function isActive(path: string) {
  return route.path === localePath(path)
}

// "My profile" and "Verification" both live on `/profile`, split by a
// `?tab=` query param (see `pages/profile.vue`) rather than separate routes
// — so unlike every other sidebar link, their active state depends on the
// query too: exactly one of the two is ever highlighted at a time.
const isOnProfilePage = computed(() => isActive('/profile'))
const isKycTabActive = computed(() => isOnProfilePage.value && route.query.tab === 'kyc')
const isProfileTabActive = computed(() => isOnProfilePage.value && route.query.tab !== 'kyc')

const isProvider = computed(() => session.activeRole.value === 'provider')
const isConsumer = computed(() => session.activeRole.value === 'consumer')

const { unreadMessages, unreadNotifications } = useUnreadCounts()
const firstName = computed(() => session.name.value.split(' ')[0] ?? '')

const mobileNavItems = computed(() => [
  { to: '/dashboard', label: t('dashboard.sidebar.dashboard') },
  ...(isProvider.value
    ? [
        { to: '/profile', label: t('dashboard.sidebar.myProfile') },
        { to: '/clients', label: t('dashboard.sidebar.clientsServed') },
        { to: '/services', label: t('dashboard.sidebar.myServices') },
      ]
    : []),
  { to: '/browse', label: t('dashboard.sidebar.browseServices') },
  ...(isConsumer.value
    ? [
        { to: '/purchases', label: t('dashboard.sidebar.myPurchases') },
        { to: '/saved-providers', label: t('dashboard.sidebar.savedProviders') },
      ]
    : []),
  { to: '/messages', label: t('dashboard.sidebar.messages') },
  { to: '/notifications', label: t('dashboard.sidebar.notifications') },
  { to: '/settings', label: t('dashboard.sidebar.settings') },
])

function linkClassActive(active: boolean) {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
    active
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
      : 'text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white',
  ]
}

function linkClass(path: string) {
  return linkClassActive(isActive(path))
}

function handleLogout() {
  session.logout()
  navigateTo(localePath('/'))
}
</script>

<template>
  <div class="flex min-h-screen bg-white text-black dark:bg-black dark:text-white">
    <aside class="hidden w-64 shrink-0 flex-col gap-0.5 border-r border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04] lg:flex">
      <NuxtLinkLocale
        to="/"
        class="flex items-center gap-2.5 px-2 pt-1.5 pb-5 font-display font-bold text-brand-700 dark:text-brand-500"
      >
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <UiIcon
            name="leaf"
            :size="19"
          />
        </span>
        <span class="text-lg">{{ t('brand.name') }}</span>
      </NuxtLinkLocale>

      <div class="px-3 pb-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
        {{ t('dashboard.sidebar.general') }}
      </div>
      <NuxtLinkLocale
        to="/dashboard"
        :class="linkClass('/dashboard')"
      >
        <UiIcon
          name="grid"
          :size="18"
        />{{ t('dashboard.sidebar.dashboard') }}
      </NuxtLinkLocale>
      <NuxtLinkLocale
        to="/messages"
        :class="linkClass('/messages')"
      >
        <UiIcon
          name="message"
          :size="18"
        />{{ t('dashboard.sidebar.messages') }}
      </NuxtLinkLocale>
      <NuxtLinkLocale
        to="/notifications"
        :class="linkClass('/notifications')"
      >
        <UiIcon
          name="bell"
          :size="18"
        />{{ t('dashboard.sidebar.notifications') }}
      </NuxtLinkLocale>

      <template v-if="isProvider">
        <div class="mt-3.5 px-3 pb-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('dashboard.sidebar.asProvider') }}
        </div>
        <NuxtLinkLocale
          to="/profile"
          :class="linkClassActive(isProfileTabActive)"
        >
          <UiIcon
            name="user"
            :size="18"
          />{{ t('dashboard.sidebar.myProfile') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          :to="{ path: '/profile', query: { tab: 'kyc' } }"
          class="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
          :class="isKycTabActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
            : 'text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white'"
        >
          <span class="flex items-center gap-3 whitespace-nowrap">
            <UiIcon
              name="shield-check"
              :size="18"
              class="shrink-0"
            />{{ t('dashboard.sidebar.kyc') }}
          </span>
          <UiTag
            variant="danger"
            size="sm"
            class="shrink-0"
          >
            {{ t('dashboard.sidebar.kycPending') }}
          </UiTag>
        </NuxtLinkLocale>
        <NuxtLinkLocale
          to="/services"
          :class="linkClass('/services')"
        >
          <UiIcon
            name="briefcase"
            :size="18"
          />{{ t('dashboard.sidebar.myServices') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          to="/clients"
          :class="linkClass('/clients')"
        >
          <UiIcon
            name="users"
            :size="18"
          />{{ t('dashboard.sidebar.clientsServed') }}
        </NuxtLinkLocale>
      </template>

      <div class="mt-3.5 px-3 pb-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
        {{ t('dashboard.sidebar.asConsumer') }}
      </div>
      <NuxtLinkLocale
        to="/browse"
        class="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-black/60 transition-colors hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <span class="flex items-center gap-3 whitespace-nowrap">
          <UiIcon
            name="search"
            :size="18"
            class="shrink-0"
          />{{ t('dashboard.sidebar.browseServices') }}
        </span>
        <UiTag
          variant="accent"
          size="sm"
          class="shrink-0"
        >
          {{ t('dashboard.sidebar.alwaysOn') }}
        </UiTag>
      </NuxtLinkLocale>
      <template v-if="isConsumer">
        <NuxtLinkLocale
          to="/purchases"
          :class="linkClass('/purchases')"
        >
          <UiIcon
            name="bag"
            :size="18"
          />{{ t('dashboard.sidebar.myPurchases') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          to="/saved-providers"
          :class="linkClass('/saved-providers')"
        >
          <UiIcon
            name="heart"
            :size="18"
          />{{ t('dashboard.sidebar.savedProviders') }}
        </NuxtLinkLocale>
      </template>

      <div class="flex-1" />
      <NuxtLinkLocale
        to="/settings"
        :class="linkClass('/settings')"
      >
        <UiIcon
          name="gear"
          :size="18"
        />{{ t('dashboard.sidebar.settings') }}
      </NuxtLinkLocale>
      <button
        type="button"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-black/60 transition-colors hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
        @click="handleLogout"
      >
        <UiIcon
          name="log-out"
          :size="18"
        />{{ t('dashboard.sidebar.logOut') }}
      </button>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-3.5 dark:border-white/10 sm:px-8">
        <nav class="hidden items-center gap-1 overflow-x-auto md:flex lg:hidden">
          <NuxtLinkLocale
            v-for="item in mobileNavItems"
            :key="item.to"
            :to="item.to"
            class="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
            :class="isActive(item.to) ? 'bg-brand-600 text-white' : 'text-black/60 dark:text-white/60'"
          >
            {{ item.label }}
          </NuxtLinkLocale>
        </nav>

        <DashboardRoleSwitch class="hidden lg:inline-flex" />

        <div class="ml-auto flex items-center gap-1.5">
          <NuxtLinkLocale
            to="/messages"
            class="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            :aria-label="t('nav.messages')"
          >
            <UiIcon
              name="message"
              :size="18"
            />
            <span
              v-if="unreadMessages > 0"
              class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white"
            >{{ formatBadgeCount(unreadMessages) }}</span>
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/notifications"
            class="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            :aria-label="t('nav.notifications')"
          >
            <UiIcon
              name="bell"
              :size="18"
            />
            <span
              v-if="unreadNotifications > 0"
              class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white"
            >{{ formatBadgeCount(unreadNotifications) }}</span>
          </NuxtLinkLocale>
          <span class="mx-1 h-6 w-px shrink-0 bg-black/10 dark:bg-white/10" />
          <UiThemeToggle />
          <span class="flex items-center gap-2 py-1 pr-1 pl-1 text-sm font-semibold">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-display text-xs font-bold text-white">
              {{ session.initials.value }}
            </span>
            {{ firstName }}
          </span>
        </div>
      </div>

      <div class="hidden items-center px-5 py-2.5 md:flex lg:hidden">
        <DashboardRoleSwitch />
      </div>

      <main
        class="flex-1 px-5 py-6 sm:px-8 sm:py-8 md:pb-8"
        :class="bottomNavHidden ? 'pb-6' : 'pb-20'"
      >
        <slot />
      </main>
    </div>

    <AppBottomNav />
    <AppMoreMenu />
  </div>
</template>
