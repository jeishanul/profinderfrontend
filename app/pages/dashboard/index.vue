<script setup lang="ts">
import type { ClientServed, DashboardSummary, PurchaseRecord } from '#shared/types/dashboard'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const session = useSession()

const roleQuery = computed(() => ({ role: session.activeRole.value }))
const { data: summary } = await useApi<DashboardSummary>('/dashboard/summary', {
  key: 'dashboard-summary',
  query: roleQuery,
})

const { data: clients } = await useApi<ClientServed[]>('/dashboard/clients', {
  key: 'dashboard-clients-preview',
  default: () => [],
})
const { data: purchases } = await useApi<PurchaseRecord[]>('/dashboard/purchases', {
  key: 'dashboard-purchases-preview',
  default: () => [],
})

const allClients = computed(() => clients.value ?? [])
const allPurchases = computed(() => purchases.value ?? [])

const isProvider = computed(() => session.activeRole.value === 'provider')

useSeoMeta({
  title: t('dashboard.overview.title'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />
    <div class="flex flex-wrap items-center gap-3.5">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 font-display text-base font-bold text-white">
        {{ session.initials.value }}
      </span>
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('dashboard.overview.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('dashboard.overview.greeting', { name: session.name.value }) }}
        </p>
      </div>
    </div>

    <DashboardDualRoleBanner />

    <template v-if="summary">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <template v-if="isProvider">
          <DashboardStatCard
            :label="t('dashboard.overview.provider.kpi.activeGigs')"
            :value="String(summary.providerKpis.activeGigs)"
          />
          <DashboardStatCard
            :label="t('dashboard.overview.provider.kpi.jobsCompleted')"
            :value="String(summary.providerKpis.jobsCompletedThisMonth)"
            :sublabel="t('dashboard.overview.provider.kpi.jobsCompletedSub', { percent: summary.providerKpis.jobsCompletedChangePercent })"
            tone="primary"
          />
          <DashboardStatCard
            :label="t('dashboard.overview.provider.kpi.clientsServed')"
            :value="String(summary.providerKpis.clientsServed)"
            :sublabel="t('dashboard.overview.provider.kpi.clientsServedSub', { count: summary.providerKpis.repeatClients })"
          />
          <DashboardStatCard
            :label="t('dashboard.overview.provider.kpi.rating')"
            :value="summary.providerKpis.averageRating.toFixed(1)"
            :sublabel="t('dashboard.overview.provider.kpi.ratingSub', { count: summary.providerKpis.reviewCount })"
            tone="accent"
          />
        </template>
        <template v-else>
          <DashboardStatCard
            :label="t('dashboard.overview.consumer.kpi.activeOrders')"
            :value="String(summary.consumerKpis.activeOrders)"
            :sublabel="t('dashboard.overview.consumer.kpi.activeOrdersSub', { count: summary.consumerKpis.ordersInProgress })"
            tone="primary"
          />
          <DashboardStatCard
            :label="t('dashboard.overview.consumer.kpi.jobsBooked')"
            :value="String(summary.consumerKpis.totalOrders)"
          />
          <DashboardStatCard
            :label="t('dashboard.overview.consumer.kpi.providersHired')"
            :value="String(summary.consumerKpis.providersHired)"
            :sublabel="t('dashboard.overview.consumer.kpi.providersHiredSub', { count: summary.consumerKpis.providersHiredTwice })"
          />
          <DashboardStatCard
            :label="t('dashboard.overview.consumer.kpi.savedProviders')"
            :value="String(summary.consumerKpis.savedProviders)"
            :sublabel="t('dashboard.overview.consumer.kpi.savedProvidersSub', { count: summary.consumerKpis.savedProvidersAvailableNow })"
            tone="accent"
          />
        </template>
      </div>

      <DashboardKycBanner
        v-if="isProvider"
        :kyc="summary.kyc"
      />

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-display text-base font-bold">
              {{ t('dashboard.overview.activity.heading') }}
            </h2>
          </div>
          <DashboardActivityFeed :items="summary.activity" />
        </div>

        <div class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
          <h2 class="mb-1 font-display text-base font-bold">
            {{ isProvider ? t('dashboard.sidebar.myServices') : t('dashboard.sidebar.browseServices') }}
          </h2>
          <div class="flex flex-col">
            <template v-if="isProvider">
              <NuxtLinkLocale
                to="/services"
                class="flex items-center gap-3 border-b border-black/10 py-3 dark:border-white/10"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
                  <UiIcon
                    name="plus"
                    :size="16"
                  />
                </span>
                <span class="min-w-0 flex-1 text-sm font-semibold">{{ t('dashboard.overview.provider.quickActions.addService') }}</span>
              </NuxtLinkLocale>
              <NuxtLinkLocale
                to="/profile"
                class="flex items-center gap-3 border-b border-black/10 py-3 dark:border-white/10"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70">
                  <UiIcon
                    name="calendar"
                    :size="16"
                  />
                </span>
                <span class="min-w-0 flex-1 text-sm font-semibold">{{ t('dashboard.overview.provider.quickActions.updateAvailability') }}</span>
              </NuxtLinkLocale>
              <NuxtLinkLocale
                :to="{ path: '/profile', query: { tab: 'kyc' } }"
                class="flex items-center gap-3 py-3"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
                  <UiIcon
                    name="shield-check"
                    :size="16"
                  />
                </span>
                <span class="min-w-0 flex-1 text-sm font-semibold">{{ t('dashboard.overview.provider.quickActions.finishKyc') }}</span>
              </NuxtLinkLocale>
            </template>
            <template v-else>
              <NuxtLinkLocale
                to="/browse"
                class="flex items-center gap-3 border-b border-black/10 py-3 dark:border-white/10"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
                  <UiIcon
                    name="search"
                    :size="16"
                  />
                </span>
                <span class="min-w-0 flex-1 text-sm font-semibold">{{ t('dashboard.overview.consumer.quickActions.browse') }}</span>
              </NuxtLinkLocale>
              <NuxtLinkLocale
                to="/messages"
                class="flex items-center gap-3 border-b border-black/10 py-3 dark:border-white/10"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70">
                  <UiIcon
                    name="message"
                    :size="16"
                  />
                </span>
                <span class="min-w-0 flex-1 text-sm font-semibold">{{ t('dashboard.overview.consumer.quickActions.message') }}</span>
              </NuxtLinkLocale>
              <NuxtLinkLocale
                to="/purchases"
                class="flex items-center gap-3 py-3"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
                  <UiIcon
                    name="star"
                    :size="16"
                  />
                </span>
                <span class="min-w-0 flex-1 text-sm font-semibold">{{ t('dashboard.overview.consumer.quickActions.review') }}</span>
              </NuxtLinkLocale>
            </template>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
        <div class="mb-3.5 flex items-center justify-between">
          <h2 class="font-display text-base font-bold">
            {{ isProvider ? t('dashboard.overview.provider.recentTable.heading') : t('dashboard.overview.consumer.recentTable.heading') }}
          </h2>
          <NuxtLinkLocale
            :to="isProvider ? '/clients' : '/purchases'"
            :class="linkButtonClass('ghost', 'sm')"
          >
            {{ t('dashboard.table.viewAll') }}
          </NuxtLinkLocale>
        </div>
        <DashboardClientsTable
          v-if="isProvider"
          :clients="allClients"
          :limit="3"
        />
        <DashboardPurchasesTable
          v-else
          :purchases="allPurchases"
          :limit="3"
        />
      </div>
    </template>
  </div>
</template>
