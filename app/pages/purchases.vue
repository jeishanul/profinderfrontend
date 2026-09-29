<script setup lang="ts">
import type { BookingStatus, PurchaseRecord } from '#shared/types/dashboard'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()

const { data: purchases } = await useApi<PurchaseRecord[]>('/dashboard/purchases', {
  key: 'dashboard-purchases',
  default: () => [],
})

const allPurchases = computed(() => purchases.value ?? [])

const filter = ref<string>('all')

const filterOptions = computed(() => {
  const list = allPurchases.value
  const countFor = (status: BookingStatus | 'all') =>
    status === 'all' ? list.length : list.filter(purchase => purchase.status === status).length

  return [
    { value: 'all', label: t('dashboard.purchases.filters.all'), count: countFor('all') },
    { value: 'completed', label: t('dashboard.purchases.filters.completed'), count: countFor('completed') },
    { value: 'in_progress', label: t('dashboard.purchases.filters.in_progress'), count: countFor('in_progress') },
    { value: 'cancelled', label: t('dashboard.purchases.filters.cancelled'), count: countFor('cancelled') },
  ]
})

const filteredPurchases = computed(() =>
  allPurchases.value.filter(purchase => filter.value === 'all' || purchase.status === filter.value),
)

const totalJobsCount = computed(() => allPurchases.value.length)
const providersHiredCount = computed(() => new Set(allPurchases.value.map(purchase => purchase.providerName)).size)
const activeOrdersCount = computed(() => allPurchases.value.filter(purchase => purchase.status === 'in_progress').length)

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
        to="/profile"
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

    <div class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
      <DashboardPurchasesTable :purchases="filteredPurchases" />
    </div>
  </div>
</template>
