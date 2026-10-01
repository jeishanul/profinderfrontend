<script setup lang="ts">
import type { NotificationItem, NotificationTopic } from '#shared/types/dashboard'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const toast = useToast()
const { confirm } = useConfirm()

// "Show more" grows the page size; a full page back means there may be more.
const PAGE_SIZE = 30
const limit = ref(PAGE_SIZE)

const { data: notifications, refresh, status } = await useApi<NotificationItem[]>('/dashboard/notifications', {
  key: 'dashboard-notifications',
  query: computed(() => ({ limit: limit.value })),
  default: () => [],
})

const hasMore = computed(() => (notifications.value?.length ?? 0) >= limit.value)

async function showMore() {
  limit.value += PAGE_SIZE
  await refresh()
}

const filter = ref<string>('all')

const filterOptions = computed(() => {
  const list = notifications.value ?? []
  const countFor = (topic: NotificationTopic | 'all') =>
    topic === 'all' ? list.length : list.filter(item => item.topic === topic).length

  return [
    { value: 'all', label: t('dashboard.notificationsPage.filters.all'), count: countFor('all') },
    { value: 'bookings', label: t('dashboard.notificationsPage.filters.bookings'), count: countFor('bookings') },
    { value: 'payments', label: t('dashboard.notificationsPage.filters.payments'), count: countFor('payments') },
    { value: 'messages', label: t('dashboard.notificationsPage.filters.messages'), count: countFor('messages') },
    { value: 'account', label: t('dashboard.notificationsPage.filters.account'), count: countFor('account') },
    { value: 'system', label: t('dashboard.notificationsPage.filters.system'), count: countFor('system') },
  ]
})

const visibleItems = computed(() =>
  (notifications.value ?? [])
    .filter(item => filter.value === 'all' || item.topic === filter.value),
)

const todayItems = computed(() => visibleItems.value.filter(item => item.timeAgoHours < 24))
const earlierItems = computed(() => visibleItems.value.filter(item => item.timeAgoHours >= 24))
const unreadCount = computed(() => (notifications.value ?? []).filter(item => !item.read).length)
const readCount = computed(() => (notifications.value ?? []).length - unreadCount.value)

/** The list and the header badge always change together. */
const refreshAll = () => Promise.all([refresh(), refreshNuxtData(UNREAD_NOTIFICATIONS_KEY)])

async function run(request: () => Promise<unknown>, failureKey = 'ui.errors.generic') {
  try {
    await request()
    await refreshAll()
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t(failureKey)))
  }
}

const markRead = (id: string) => run(() => useApiFetch(`/api/dashboard/notifications/${id}/read`, { method: 'PATCH' }))
const markAllRead = () => run(() => useApiFetch('/api/dashboard/notifications/read-all', { method: 'PATCH' }))
const remove = (id: string) => run(() => useApiFetch(`/api/dashboard/notifications/${id}`, { method: 'DELETE' }))

async function clearRead() {
  const confirmed = await confirm({
    title: t('dashboard.notificationsPage.clearConfirm.title'),
    message: t('dashboard.notificationsPage.clearConfirm.message'),
    confirmLabel: t('dashboard.notificationsPage.clearRead'),
    tone: 'danger',
  })
  if (confirmed) await run(() => useApiFetch('/api/dashboard/notifications', { method: 'DELETE' }))
}

useSeoMeta({
  title: t('dashboard.notificationsPage.title'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('dashboard.notificationsPage.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('dashboard.notificationsPage.subtitle') }}
        </p>
      </div>
      <div class="flex gap-2">
        <UiButton
          variant="ghost"
          :disabled="unreadCount === 0"
          @click="markAllRead"
        >
          {{ t('dashboard.notificationsPage.markAllRead') }}
        </UiButton>
        <UiButton
          variant="ghost"
          :disabled="readCount === 0"
          @click="clearRead"
        >
          {{ t('dashboard.notificationsPage.clearRead') }}
        </UiButton>
      </div>
    </div>

    <DashboardFilterTabs
      v-model="filter"
      :options="filterOptions"
    />

    <div class="rounded-2xl border border-black/10 p-3 sm:p-5 dark:border-white/10">
      <template v-if="todayItems.length > 0">
        <div class="px-2 pt-2 pb-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('dashboard.notificationsPage.today') }}
        </div>
        <DashboardNotificationRow
          v-for="item in todayItems"
          :key="item.id"
          :item="item"
          @read="markRead"
          @remove="remove"
        />
      </template>

      <template v-if="earlierItems.length > 0">
        <div class="px-2 pt-4 pb-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('dashboard.notificationsPage.earlier') }}
        </div>
        <DashboardNotificationRow
          v-for="item in earlierItems"
          :key="item.id"
          :item="item"
          @read="markRead"
          @remove="remove"
        />
      </template>

      <p
        v-if="visibleItems.length === 0"
        class="py-8 text-center text-sm text-black/50 dark:text-white/50"
      >
        {{ t('dashboard.notificationsPage.empty') }}
      </p>

      <div
        v-if="hasMore"
        class="mt-3 flex justify-center"
      >
        <UiButton
          variant="ghost"
          :disabled="status === 'pending'"
          @click="showMore"
        >
          {{ t('dashboard.notificationsPage.showMore') }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
