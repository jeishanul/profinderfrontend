<script setup lang="ts">
import type { BillingTransaction, InvoiceFilter, InvoiceListMeta, InvoiceSummary } from '#shared/types/billing'

// Billing: the provider's verification levels (buy / renew a plan), their invoices and the payments made. A
// non-provider account gets a short "become a pro" prompt instead (the API refuses them anyway).
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t, locale } = useI18n()
const session = useSession()
const isProvider = session.isProvider.value

const { data: overview, status: overviewStatus, error: overviewError, refresh: refreshOverview } = useBillingOverview(isProvider)
const billing = computed(() => overview.value?.data ?? null)

const filter = ref<InvoiceFilter>('all')
const invoices = usePagedList<InvoiceSummary, InvoiceListMeta>('/dashboard/billing/invoices', {
  key: 'billing-invoices',
  query: computed(() => ({ status: filter.value === 'all' ? undefined : filter.value })),
  itemKey: invoice => invoice.number,
  server: false,
  immediate: isProvider,
})
const transactions = usePagedList<BillingTransaction>('/dashboard/billing/transactions', {
  key: 'billing-transactions',
  server: false,
  immediate: isProvider,
})

// Chip counts come from the server, so they cover every invoice, not just the loaded page.
const filterOptions = computed(() => (['all', 'unpaid', 'paid'] as const).map(value => ({
  value,
  label: t(`billing.invoices.filters.${value}`),
  count: invoices.meta.value?.counts[value] ?? 0,
})))
const filterModel = computed({
  get: () => filter.value as string,
  set: (value: string) => {
    filter.value = value as InvoiceFilter
  },
})

function money(amount: number, currency: string) {
  return formatMoney(amount, currency, locale.value)
}

useSeoMeta({
  title: () => t('billing.seoTitle'),
  description: () => t('billing.subtitle'),
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <UiBackButton fallback="/dashboard" />
    <div>
      <h1 class="font-display text-2xl font-bold">
        {{ t('billing.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
        {{ t('billing.subtitle') }}
      </p>
    </div>

    <div
      v-if="!isProvider"
      class="rounded-3xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15"
    >
      <h2 class="font-display text-lg font-bold">
        {{ t('billing.notProvider.title') }}
      </h2>
      <p class="mx-auto mt-1 max-w-md text-sm text-black/60 dark:text-white/60">
        {{ t('billing.notProvider.body') }}
      </p>
      <NuxtLinkLocale
        to="/become-a-provider"
        :class="[linkButtonClass('primary'), 'mt-5']"
      >
        {{ t('billing.notProvider.cta') }}
      </NuxtLinkLocale>
    </div>

    <template v-else>
      <section
        class="rounded-2xl border border-brand-600/30 bg-brand-50/60 p-5 text-sm dark:bg-brand-700/10"
        aria-labelledby="billing-how"
      >
        <h2
          id="billing-how"
          class="flex items-center gap-2 font-bold"
        >
          <UiIcon
            name="info"
            :size="16"
          />{{ t('billing.howItWorks.title') }}
        </h2>
        <p class="mt-1 text-black/70 dark:text-white/70">
          {{ t('billing.howItWorks.payFirst') }}
        </p>
        <p
          v-if="billing"
          class="mt-1 text-black/70 dark:text-white/70"
        >
          {{ t('billing.howItWorks.renewal', { count: billing.renewalDaysBefore }, billing.renewalDaysBefore) }}
        </p>
      </section>

      <section aria-labelledby="billing-levels">
        <h2
          id="billing-levels"
          class="mb-3 font-display text-lg font-bold"
        >
          {{ t('billing.levels.title') }}
        </h2>
        <div
          v-if="billing"
          class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4"
        >
          <BillingLevelCard
            v-for="level in billing.levels"
            :key="level.id"
            :level="level"
            @changed="refreshOverview()"
          />
        </div>
        <div
          v-else-if="overviewError"
          role="alert"
          class="flex flex-wrap items-center gap-3 text-sm text-red-700 dark:text-red-300"
        >
          {{ t('billing.loadFailed') }}
          <UiButton
            variant="ghost"
            size="sm"
            @click="refreshOverview()"
          >
            {{ t('billing.retry') }}
          </UiButton>
        </div>
        <div
          v-else-if="overviewStatus === 'pending'"
          class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4"
          aria-hidden="true"
        >
          <div
            v-for="index in 4"
            :key="index"
            class="h-64 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5"
          />
        </div>
      </section>

      <section
        class="flex flex-col gap-4"
        aria-labelledby="billing-invoices"
      >
        <h2
          id="billing-invoices"
          class="font-display text-lg font-bold"
        >
          {{ t('billing.invoices.title') }}
        </h2>
        <DashboardFilterTabs
          v-model="filterModel"
          :options="filterOptions"
        />
        <ul
          v-if="invoices.items.value.length > 0"
          class="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10"
        >
          <li
            v-for="invoice in invoices.items.value"
            :key="invoice.number"
          >
            <NuxtLinkLocale
              :to="`/billing/invoices/${encodeURIComponent(invoice.number)}`"
              class="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
            >
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60">
                <UiIcon
                  name="file"
                  :size="18"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-bold">
                  {{ invoice.number }}
                  <span
                    v-if="invoice.kind === 'renewal'"
                    class="ml-1 text-xs font-semibold text-black/50 dark:text-white/50"
                  >· {{ t('billing.invoices.renewal') }}</span>
                </span>
                <span class="block truncate text-xs text-black/60 dark:text-white/60">
                  {{ invoice.levelName }} · {{ invoice.planName }} ({{ invoice.durationLabel }})
                </span>
                <span
                  v-if="invoice.paidAt"
                  class="block text-xs text-black/50 dark:text-white/50"
                >{{ t('billing.invoices.paidOn', { date: formatDate(invoice.paidAt, locale) }) }}</span>
                <span
                  v-else-if="invoice.dueAt && invoice.status !== 'cancelled'"
                  class="block text-xs"
                  :class="invoice.isOverdue ? 'font-semibold text-red-700 dark:text-red-300' : 'text-black/50 dark:text-white/50'"
                >{{ t('billing.invoices.due', { date: formatDate(invoice.dueAt, locale) }) }}</span>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-1.5">
                <span class="text-sm font-bold">{{ money(invoice.amount, invoice.currency) }}</span>
                <BillingInvoiceStatusBadge :invoice="invoice" />
              </span>
            </NuxtLinkLocale>
          </li>
        </ul>
        <div
          v-else-if="!invoices.pending.value"
          class="rounded-3xl border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/15"
        >
          <h3 class="font-display text-base font-bold">
            {{ t('billing.invoices.empty') }}
          </h3>
          <p class="mt-1 text-sm text-black/60 dark:text-white/60">
            {{ t('billing.invoices.emptySub') }}
          </p>
        </div>
        <DashboardLoadMore
          :shown="invoices.items.value.length"
          :total="invoices.meta.value?.total ?? 0"
          :has-more="invoices.hasMore.value"
          :loading="invoices.loadingMore.value"
          :failed="invoices.loadMoreFailed.value"
          @more="invoices.loadMore()"
        />
      </section>

      <section
        class="flex flex-col gap-4"
        aria-labelledby="billing-payments"
      >
        <h2
          id="billing-payments"
          class="font-display text-lg font-bold"
        >
          {{ t('billing.transactions.title') }}
        </h2>
        <ul
          v-if="transactions.items.value.length > 0"
          class="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10"
        >
          <li
            v-for="transaction in transactions.items.value"
            :key="transaction.id"
            class="flex items-center gap-3.5 px-4 py-3.5"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
              <UiIcon
                name="wallet"
                :size="18"
              />
            </span>
            <span class="min-w-0 flex-1 text-sm">
              <NuxtLinkLocale
                v-if="transaction.invoiceNumber"
                :to="`/billing/invoices/${encodeURIComponent(transaction.invoiceNumber)}`"
                class="block font-bold hover:text-brand-700 dark:hover:text-brand-400"
              >{{ t('billing.transactions.invoice', { number: transaction.invoiceNumber }) }}</NuxtLinkLocale>
              <span class="block truncate text-xs text-black/60 dark:text-white/60">
                {{ [transaction.levelName, transaction.methodName].filter(Boolean).join(' · ') }}
              </span>
              <span
                v-if="transaction.reference"
                class="block truncate text-xs text-black/50 dark:text-white/50"
              >{{ t('billing.transactions.reference', { reference: transaction.reference }) }}</span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-0.5">
              <span class="text-sm font-bold">{{ money(transaction.amount, transaction.currency) }}</span>
              <span
                v-if="transaction.paidAt"
                class="text-xs text-black/50 dark:text-white/50"
              >{{ formatDate(transaction.paidAt, locale) }}</span>
            </span>
          </li>
        </ul>
        <p
          v-else-if="!transactions.pending.value"
          class="text-sm text-black/60 dark:text-white/60"
        >
          {{ t('billing.transactions.empty') }}
        </p>
        <DashboardLoadMore
          :shown="transactions.items.value.length"
          :total="transactions.meta.value?.total ?? 0"
          :has-more="transactions.hasMore.value"
          :loading="transactions.loadingMore.value"
          :failed="transactions.loadMoreFailed.value"
          @more="transactions.loadMore()"
        />
      </section>
    </template>
  </div>
</template>
