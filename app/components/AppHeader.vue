<script setup lang="ts">
import type { ServiceCategory } from '#shared/types/marketplace'

// Nav labels come from i18n messages, not hardcoded strings.
const { t } = useI18n()

const links = computed(() => [
  { label: t('nav.howItWorks'), to: '/#how-it-works' },
  { label: t('nav.browseServices'), to: '/browse' },
])

// Only the home page's hero ever docks its search bar into the header (see
// `useHeroSearchDock`); guard on the route so a stale flag from a previous
// visit never shows the compact search on another page.
const route = useRoute()
const isHomeRoute = computed(() => String(route.name ?? '').startsWith('index'))
const { isDocked } = useHeroSearchDock()
const showDockedSearch = computed(() => isHomeRoute.value && isDocked.value)

const { data: categories } = await useApi<ServiceCategory[]>('/categories', { lazy: true, default: () => [] })

const authModal = useAuthModal()
const session = useSession()
const { unreadMessages, unreadNotifications } = useUnreadCounts()
const firstName = computed(() => session.name.value.split(' ')[0] ?? '')

const localePath = useLocalePath()
function handleDockedSearch({ category, province, city, barangay }: { category: string, province: string, city: string, barangay: string }) {
  navigateTo(localePath({
    path: '/browse',
    query: {
      ...(category ? { categories: category } : {}),
      ...(province ? { province } : {}),
      ...(city ? { city } : {}),
      ...(barangay ? { barangay } : {}),
    },
  }))
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-black/10 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black/50">
    <nav class="relative mx-auto flex h-[84px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
      <NuxtLinkLocale
        to="/"
        class="flex shrink-0 items-center gap-2.5 font-display font-bold text-brand-700 dark:text-brand-500"
      >
        <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <UiIcon
            name="leaf"
            :size="22"
          />
        </span>
        <span class="text-xl">{{ t('brand.name') }}</span>
      </NuxtLinkLocale>

      <ul
        class="hidden items-center gap-9 text-sm font-semibold transition-opacity duration-300 md:flex"
        :class="showDockedSearch ? 'pointer-events-none absolute opacity-0' : 'opacity-100'"
      >
        <li
          v-for="link in links"
          :key="link.to"
        >
          <NuxtLinkLocale
            :to="link.to"
            class="hover:text-brand-700"
          >
            {{ link.label }}
          </NuxtLinkLocale>
        </li>
      </ul>

      <div
        class="absolute left-1/2 hidden max-w-md flex-1 -translate-x-1/2 transition-all duration-300 md:flex"
        :class="showDockedSearch ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1.5 opacity-0'"
      >
        <MarketplaceServiceSearchBar
          variant="compact"
          :categories="categories ?? []"
          class="w-full"
          @submit="handleDockedSearch"
        />
      </div>

      <!-- Messages/notifications/avatar (logged in) and Log in/Sign up
           (guest) both hide below `md` — with `AppBottomNav` + `AppMoreMenu`
           now covering that same navigation on mobile (Messages is a tab;
           notifications, account and auth all live in the More sheet),
           keeping them here too overflowed this header at 390px width (the
           real bug this fixes) for no benefit, since it's now a second path
           to the same places. Theme toggle stays — it's the one control
           with no mobile equivalent on a page using this (marketing-site)
           header. -->
      <div class="flex shrink-0 items-center gap-3.5">
        <UiThemeToggle />
        <div
          v-if="session.isAuthenticated.value"
          class="hidden items-center gap-1.5 md:flex"
        >
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
          <NuxtLinkLocale
            to="/dashboard"
            class="flex items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
          >
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 font-display text-xs font-bold text-white">
              {{ session.initials.value }}
            </span>
            {{ firstName }}
          </NuxtLinkLocale>
        </div>
        <div
          v-else
          class="hidden items-center gap-2.5 md:flex"
        >
          <UiButton
            variant="ghost"
            @click="authModal.open('login')"
          >
            {{ t('nav.login') }}
          </UiButton>
          <UiButton
            variant="primary"
            @click="authModal.open('register')"
          >
            {{ t('nav.signup') }}
          </UiButton>
        </div>
        <UiLocaleSwitcher />
      </div>
    </nav>
  </header>
</template>
