<script setup lang="ts">
import type { ClientListMeta, ClientServed } from '#shared/types/dashboard'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'provider'],
  hideBottomNav: true,
})

const { t } = useI18n()
const { money } = useSiteSettings()

const filter = ref<string>('all')
const search = ref('')
const debouncedSearch = refDebounced(search, 300)

const list = await usePagedList<ClientServed, ClientListMeta>('/dashboard/clients', {
  key: 'dashboard-clients',
  query: computed(() => ({
    status: filter.value === 'all' ? undefined : filter.value,
    q: debouncedSearch.value.trim() || undefined,
  })),
})

// Chip counts and headline numbers come from the server, so they cover the whole history, not just what is loaded.
const filterOptions = computed(() => {
  const counts = list.meta.value?.counts
  return (['all', 'upcoming', 'in_progress', 'completed', 'cancelled'] as const).map(value => ({
    value,
    label: t(`dashboard.clients.filters.${value}`),
    count: counts?.[value] ?? 0,
  }))
})

const totalEarned = computed(() => list.meta.value?.totals.earned ?? 0)
const clientsServedCount = computed(() => list.meta.value?.totals.clientsServed ?? 0)
const repeatCount = computed(() => list.meta.value?.totals.repeatClients ?? 0)

useSeoMeta({
  title: t('dashboard.clients.title'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />
    <div>
      <h1 class="font-display text-2xl font-bold">
        {{ t('dashboard.clients.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
        {{ t('dashboard.clients.subtitle') }}
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <DashboardStatCard
        :label="t('dashboard.clients.summary.total')"
        :value="String(clientsServedCount)"
      />
      <DashboardStatCard
        :label="t('dashboard.clients.summary.repeat')"
        :value="String(repeatCount)"
      />
      <DashboardStatCard
        :label="t('dashboard.clients.summary.earned')"
        :value="money(totalEarned)"
      />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <DashboardFilterTabs
        v-model="filter"
        :options="filterOptions"
      />
      <UiInput
        v-model="search"
        icon="search"
        class="w-full sm:w-64"
        :placeholder="t('dashboard.clients.searchPlaceholder')"
      />
    </div>

    <div class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
      <DashboardClientsTable :clients="list.items.value" />
    </div>

    <DashboardLoadMore
      :shown="list.items.value.length"
      :total="list.meta.value?.total ?? 0"
      :has-more="list.hasMore.value"
      :loading="list.loadingMore.value"
      :failed="list.loadMoreFailed.value"
      @more="list.loadMore()"
    />
  </div>
</template>
