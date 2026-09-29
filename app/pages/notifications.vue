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

const { data: notifications, refresh } = await useApi<NotificationItem[]>('/dashboard/notifications', {
  key: 'dashboard-notifications',
  default: () => [],
})

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
  ]
})

const visibleItems = computed(() =>
  (notifications.value ?? [])
    .filter(item => filter.value === 'all' || item.topic === filter.value),
)

const todayItems = computed(() => visibleItems.value.filter(item => item.timeAgoHours < 24))
const earlierItems = computed(() => visibleItems.value.filter(item => item.timeAgoHours >= 24))

async function markRead(id: string) {
  await useApiFetch(`/api/dashboard/notifications/${id}/read`, { method: 'PATCH' })
  await refresh()
}

async function markAllRead() {
  const unread = (notifications.value ?? []).filter(item => !item.read)
  await Promise.all(unread.map(item => useApiFetch(`/api/dashboard/notifications/${item.id}/read`, { method: 'PATCH' })))
  await refresh()
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
      <UiButton
        variant="ghost"
        @click="markAllRead"
      >
        {{ t('dashboard.notificationsPage.markAllRead') }}
      </UiButton>
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
        />
      </template>

      <p
        v-if="visibleItems.length === 0"
        class="py-8 text-center text-sm text-black/50 dark:text-white/50"
      >
        {{ t('dashboard.notificationsPage.empty') }}
      </p>
    </div>
  </div>
</template>
