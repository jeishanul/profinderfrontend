<script setup lang="ts">
// Auto-imported as <AppMoreMenu />. Mobile-only overflow sheet opened from
// <AppBottomNav>'s More tab (`useMoreMenu`) — everything that doesn't fit
// the 4-tab bar lives here or as a Home quick-tap tile. Mount once per
// layout, next to `MarketplaceAuthModal` (same pattern).
const { t } = useI18n()
const moreMenu = useMoreMenu()
const session = useSession()
const authModal = useAuthModal()
const { unreadNotifications } = useUnreadCounts()

const isProvider = computed(() => session.activeRole.value === 'provider')

function go() {
  moreMenu.close()
}

function handleLogout() {
  session.logout()
  moreMenu.close()
  navigateTo(useLocalePath()('/'))
}

function openAuth(view: 'login' | 'register') {
  moreMenu.close()
  authModal.open(view)
}

const itemClass = 'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10'
const iconWrapClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70'
</script>

<template>
  <UiBottomSheet
    :open="moreMenu.isOpen.value"
    labelledby="more-menu-heading"
    @close="moreMenu.close()"
  >
    <div class="px-5 pb-6">
      <h2
        id="more-menu-heading"
        class="sr-only"
      >
        {{ t('nav.more') }}
      </h2>

      <template v-if="session.isAuthenticated.value">
        <NuxtLinkLocale
          to="/profile"
          class="flex items-center gap-3 rounded-2xl px-1 py-3"
          @click="go"
        >
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 font-display text-base font-bold text-white">
            {{ session.initials.value }}
          </span>
          <span class="flex-1">
            <span class="block text-base font-bold">{{ session.name.value }}</span>
            <span class="block text-xs text-black/50 dark:text-white/50">{{ t('more.viewProfile') }}</span>
          </span>
          <UiIcon
            name="chevron-left"
            :size="16"
            class="rotate-180 text-black/30 dark:text-white/30"
          />
        </NuxtLinkLocale>

        <DashboardRoleSwitch class="mb-2 w-full [&>button]:flex-1" />

        <div class="mt-1 mb-1 px-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('dashboard.sidebar.general') }}
        </div>
        <NuxtLinkLocale
          to="/dashboard"
          :class="itemClass"
          @click="go"
        >
          <span :class="iconWrapClass">
            <UiIcon
              name="grid"
              :size="17"
            />
          </span>
          {{ t('dashboard.sidebar.dashboard') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          v-if="!isProvider"
          to="/purchases"
          :class="itemClass"
          @click="go"
        >
          <span :class="iconWrapClass">
            <UiIcon
              name="bag"
              :size="17"
            />
          </span>
          {{ t('dashboard.sidebar.myPurchases') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          to="/notifications"
          :class="itemClass"
          @click="go"
        >
          <span :class="iconWrapClass">
            <UiIcon
              name="bell"
              :size="17"
            />
          </span>
          <span class="flex-1">{{ t('dashboard.sidebar.notifications') }}</span>
          <span
            v-if="unreadNotifications > 0"
            class="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-[11px] font-bold text-white"
          >{{ formatBadgeCount(unreadNotifications) }}</span>
        </NuxtLinkLocale>

        <template v-if="isProvider">
          <div class="mt-3 mb-1 px-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
            {{ t('dashboard.sidebar.asProvider') }}
          </div>
          <NuxtLinkLocale
            to="/clients"
            :class="itemClass"
            @click="go"
          >
            <span :class="iconWrapClass">
              <UiIcon
                name="users"
                :size="17"
              />
            </span>
            {{ t('dashboard.sidebar.clientsServed') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/services"
            :class="itemClass"
            @click="go"
          >
            <span :class="iconWrapClass">
              <UiIcon
                name="briefcase"
                :size="17"
              />
            </span>
            {{ t('dashboard.sidebar.myServices') }}
          </NuxtLinkLocale>
        </template>

        <div class="mt-3 mb-1 px-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('more.generalSection') }}
        </div>
        <NuxtLinkLocale
          to="/settings"
          :class="itemClass"
          @click="go"
        >
          <span :class="iconWrapClass">
            <UiIcon
              name="gear"
              :size="17"
            />
          </span>
          {{ t('dashboard.sidebar.settings') }}
        </NuxtLinkLocale>
        <button
          type="button"
          :class="[itemClass, 'w-full text-red-600 dark:text-red-400']"
          @click="handleLogout"
        >
          <span :class="[iconWrapClass, 'text-red-600! dark:text-red-400!']">
            <UiIcon
              name="log-out"
              :size="17"
            />
          </span>
          {{ t('dashboard.sidebar.logOut') }}
        </button>
      </template>

      <template v-else>
        <p class="px-1 pt-2 pb-4 text-sm text-black/60 dark:text-white/60">
          {{ t('more.loginPrompt') }}
        </p>
        <div class="flex gap-2.5">
          <UiButton
            variant="ghost"
            class="flex-1 justify-center"
            @click="openAuth('login')"
          >
            {{ t('nav.login') }}
          </UiButton>
          <UiButton
            variant="primary"
            class="flex-1 justify-center"
            @click="openAuth('register')"
          >
            {{ t('nav.signup') }}
          </UiButton>
        </div>
      </template>
    </div>
  </UiBottomSheet>
</template>
