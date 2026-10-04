<script setup lang="ts">
import type { PurchaseListMeta, PurchaseRecord } from '#shared/types/dashboard'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const session = useSession()

const route = useRoute()
// `?filter=to_review` (the dashboard's "Leave a review" shortcut) lands on the jobs still waiting for one.
const filter = ref<string>(typeof route.query.filter === 'string' ? route.query.filter : 'all')
const search = ref('')
const debouncedSearch = refDebounced(search, 300)

const list = await usePagedList<PurchaseRecord, PurchaseListMeta>('/dashboard/purchases', {
  key: 'dashboard-purchases',
  query: computed(() => ({
    status: filter.value === 'all' ? undefined : filter.value,
    q: debouncedSearch.value.trim() || undefined,
  })),
})

// Chip counts and headline numbers come from the server, so they cover the whole list, not just what is loaded.
const filterOptions = computed(() => {
  const counts = list.meta.value?.counts
  return (['all', 'upcoming', 'completed', 'in_progress', 'cancelled', 'to_review'] as const).map(value => ({
    value,
    label: t(`dashboard.purchases.filters.${value}`),
    count: counts?.[value] ?? 0,
  }))
})

const totalJobsCount = computed(() => list.meta.value?.counts.all ?? 0)
const providersHiredCount = computed(() => list.meta.value?.totals.providersHired ?? 0)
const activeOrdersCount = computed(() => list.meta.value?.totals.active ?? 0)

useSeoMeta({
  title: t('dashboard.purchases.title'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('dashboard.purchases.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('dashboard.purchases.subtitle') }}
        </p>
      </div>
      <NuxtLinkLocale
        to="/browse"
        :class="linkButtonClass('primary')"
      >
        <UiIcon
          name="search"
          :size="15"
        />{{ t('dashboard.purchases.browseMore') }}
      </NuxtLinkLocale>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-black/[0.02] px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div class="flex items-center gap-3.5">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
          <UiIcon
            name="briefcase"
            :size="18"
          />
        </span>
        <div>
          <div class="text-sm font-bold">
            {{ t('dashboard.purchases.sellBanner.title') }}
          </div>
          <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
            {{ t('dashboard.purchases.sellBanner.body') }}
          </div>
        </div>
      </div>
      <NuxtLinkLocale
        :to="session.isProvider.value ? '/profile' : '/become-a-provider'"
        :class="linkButtonClass('secondary')"
      >
        {{ t('dashboard.purchases.sellBanner.cta') }}
      </NuxtLinkLocale>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <DashboardStatCard
        :label="t('dashboard.purchases.summary.totalJobs')"
        :value="String(totalJobsCount)"
      />
      <DashboardStatCard
        :label="t('dashboard.purchases.summary.providersHired')"
        :value="String(providersHiredCount)"
      />
      <DashboardStatCard
        :label="t('dashboard.purchases.summary.activeOrders')"
        :value="String(activeOrdersCount)"
      />
    </div>

    <DashboardFilterTabs
      v-model="filter"
      :options="filterOptions"
    />

    <UiInput
      v-model="search"
      icon="search"
      class="w-full sm:w-72"
      :placeholder="t('dashboard.purchases.searchPlaceholder')"
    />

    <div class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
      <DashboardPurchasesTable :purchases="list.items.value" />
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
