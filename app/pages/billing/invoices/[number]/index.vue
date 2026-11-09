<script setup lang="ts">
import type { Invoice } from '#shared/types/billing'

// One verification invoice: a clean, printable document (the dashboard chrome and the action panels hide in print),
// with the ways to pay it while it is unpaid, the "waiting for confirmation" state after a bank transfer was
// reported, and a nudge to upload documents once it is paid. Buttons follow the server's `canPay` / `canCancel`.
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t, locale } = useI18n()
const { settings } = useSiteSettings()
const toast = useToast()
const { confirm } = useConfirm()
const route = useRoute()

const number = String(route.params.number)
const { data: response, error, status, refresh } = await useApi<{ data: Invoice }>(`/dashboard/billing/invoices/${encodeURIComponent(number)}`, {
  key: `billing-invoice-${number}`,
})
const invoice = computed(() => response.value?.data ?? null)

const paypalCancelled = computed(() => route.query.paypal === 'cancelled')

function money(amount: number, currency: string) {
  return formatMoney(amount, currency, locale.value)
}

function date(value: string | null) {
  return value ? formatDate(value, locale.value) : '—'
}

function onUpdated(updated: Invoice) {
  response.value = { data: updated }
  refreshNuxtData(BILLING_OVERVIEW_KEY)
}

const busy = ref(false)
async function cancelInvoice() {
  const confirmed = await confirm({
    title: t('billing.invoice.cancelConfirm.title'),
    message: t('billing.invoice.cancelConfirm.message'),
    confirmLabel: t('billing.invoice.cancelConfirm.confirm'),
    tone: 'danger',
  })
  if (!confirmed) return
  busy.value = true
  try {
    const result = await useApiFetch<{ data: Invoice }>(`/api/dashboard/billing/invoices/${encodeURIComponent(number)}/cancel`, { method: 'POST' })
    onUpdated(result.data)
    toast.success(t('billing.invoice.cancelled'))
  }
  catch (cancelError) {
    toast.error(apiErrorMessage(cancelError, t('billing.invoice.cancelFailed')))
    await refresh()
  }
  finally {
    busy.value = false
  }
}

function print() {
  window.print()
}

useSeoMeta({
  title: () => t('billing.invoice.seoTitle', { number }),
  description: () => t('billing.subtitle'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton
      fallback="/billing"
      class="print:hidden"
    />
    <div class="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <NuxtLinkLocale
        to="/billing"
        class="hidden items-center gap-1.5 text-sm font-semibold text-black/60 hover:text-black md:inline-flex dark:text-white/60 dark:hover:text-white"
      >
        <UiIcon
          name="chevron-left"
          :size="15"
        />
        {{ t('billing.invoice.back') }}
      </NuxtLinkLocale>
      <div
        v-if="invoice"
        class="flex flex-wrap items-center gap-2"
      >
        <UiButton
          v-if="invoice.canCancel"
          variant="ghost"
          size="sm"
          :disabled="busy"
          @click="cancelInvoice"
        >
          {{ t('billing.invoice.cancel') }}
        </UiButton>
        <UiButton
          variant="secondary"
          size="sm"
          @click="print"
        >
          {{ t('billing.invoice.print') }}
        </UiButton>
      </div>
    </div>

    <p
      v-if="error"
      role="alert"
      class="text-sm text-red-700 dark:text-red-300"
    >
      {{ t('billing.invoice.loadFailed') }}
    </p>
    <div
      v-else-if="!invoice && status === 'pending'"
      class="h-96 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5"
      aria-hidden="true"
    />

    <template v-else-if="invoice">
      <div
        v-if="paypalCancelled && invoice.canPay"
        role="status"
        class="rounded-2xl bg-accent-50 px-4 py-3 text-sm font-semibold text-accent-700 print:hidden dark:bg-accent-700/20 dark:text-accent-100"
      >
        {{ t('billing.invoice.paypalCancelled') }}
      </div>

      <div
        v-if="invoice.status === 'unpaid' && invoice.reviewNote"
        role="alert"
        class="rounded-2xl border border-red-600/30 bg-red-50 p-4 text-sm print:hidden dark:bg-red-900/10"
      >
        <p class="font-bold text-red-700 dark:text-red-300">
          {{ t('billing.invoice.sentBack.title') }}
        </p>
        <p class="mt-0.5 whitespace-pre-line">
          {{ invoice.reviewNote }}
        </p>
        <p class="mt-1 text-xs text-black/60 dark:text-white/60">
          {{ t('billing.invoice.sentBack.body') }}
        </p>
      </div>

      <div
        v-if="invoice.status === 'unpaid' && invoice.paypalPending"
        role="status"
        class="rounded-2xl border border-accent-600/30 bg-accent-50 p-4 text-sm print:hidden dark:bg-accent-700/10"
      >
        <p class="font-bold text-accent-700 dark:text-accent-100">
          {{ t('billing.invoice.paypalPending.title') }}
        </p>
        <p class="mt-0.5">
          {{ t('billing.invoice.paypalPending.body') }}
        </p>
      </div>

      <div
        v-if="invoice.status === 'pending_review'"
        role="status"
        class="rounded-2xl border border-accent-600/30 bg-accent-50 p-4 text-sm print:hidden dark:bg-accent-700/10"
      >
        <p class="font-bold text-accent-700 dark:text-accent-100">
          {{ t('billing.invoice.waiting.title') }}
        </p>
        <p class="mt-0.5">
          {{ t('billing.invoice.waiting.body', { method: invoice.paymentMethodName ?? '—', reference: invoice.paymentReference ?? '—' }) }}
        </p>
        <a
          v-if="invoice.hasProof"
          :href="`/api/dashboard/billing/invoices/${encodeURIComponent(invoice.number)}/proof`"
          target="_blank"
          rel="noopener"
          class="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline dark:text-brand-100"
        >{{ t('billing.invoice.waiting.viewProof') }}</a>
      </div>

      <div
        v-if="invoice.status === 'paid'"
        role="status"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-600/30 bg-brand-50 p-4 text-sm print:hidden dark:bg-brand-700/10"
      >
        <div>
          <p class="font-bold text-brand-700 dark:text-brand-100">
            {{ t('billing.invoice.paidState.title') }}
          </p>
          <p class="mt-0.5">
            {{ t('billing.invoice.paidState.body', { level: invoice.levelName }) }}
          </p>
        </div>
        <NuxtLinkLocale
          :to="{ path: '/profile', query: { tab: 'kyc' } }"
          :class="linkButtonClass('primary', 'sm')"
        >
          {{ t('billing.invoice.paidState.cta') }}
        </NuxtLinkLocale>
      </div>

      <p
        v-if="invoice.status === 'cancelled'"
        role="status"
        class="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-black/60 print:hidden dark:bg-white/10 dark:text-white/60"
      >
        {{ t('billing.invoice.cancelledState') }}
      </p>

      <div class="grid gap-6 xl:grid-cols-[1fr_360px] print:block">
        <!-- The document itself: always paper-white, so it reads (and prints) the same in either theme. -->
        <article class="rounded-2xl border border-black/10 bg-white p-6 text-black print:rounded-none print:border-0 print:p-0">
          <header class="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-4">
            <div>
              <p class="font-display text-xl font-bold">
                {{ settings.siteName }}
              </p>
              <p
                v-if="settings.contactEmail || settings.contactPhone"
                class="mt-0.5 text-xs text-black/60"
              >
                {{ [settings.contactEmail, settings.contactPhone].filter(Boolean).join(' · ') }}
              </p>
            </div>
            <div class="text-right">
              <h1 class="font-display text-lg font-bold">
                {{ t('billing.invoice.title') }} {{ invoice.number }}
              </h1>
              <div class="mt-1 flex justify-end">
                <BillingInvoiceStatusBadge :invoice="invoice" />
              </div>
            </div>
          </header>

          <section class="grid gap-4 border-b border-black/10 py-4 text-sm sm:grid-cols-2">
            <div>
              <h2 class="text-xs font-bold tracking-wide text-black/50 uppercase">
                {{ t('billing.invoice.billedTo') }}
              </h2>
              <p class="mt-1 font-semibold">
                {{ invoice.billedTo.name }}
              </p>
              <p v-if="invoice.billedTo.email">
                {{ invoice.billedTo.email }}
              </p>
            </div>
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt class="text-black/60">
                {{ t('billing.invoice.issued') }}
              </dt>
              <dd>{{ date(invoice.createdAt) }}</dd>
              <dt class="text-black/60">
                {{ t('billing.invoice.dueDate') }}
              </dt>
              <dd :class="invoice.isOverdue && 'font-semibold text-red-700'">
                {{ date(invoice.dueAt) }}
              </dd>
              <template v-if="invoice.paidAt">
                <dt class="text-black/60">
                  {{ t('billing.invoice.paidOn') }}
                </dt>
                <dd>{{ date(invoice.paidAt) }}</dd>
              </template>
              <template v-if="invoice.paymentMethodName">
                <dt class="text-black/60">
                  {{ t('billing.invoice.paymentMethod') }}
                </dt>
                <dd>{{ invoice.paymentMethodName }}</dd>
              </template>
              <template v-if="invoice.paymentReference">
                <dt class="text-black/60">
                  {{ t('billing.invoice.reference') }}
                </dt>
                <dd class="break-all">
                  {{ invoice.paymentReference }}
                </dd>
              </template>
            </dl>
          </section>

          <table class="mt-4 w-full text-sm">
            <thead>
              <tr class="border-b border-black/10 text-left text-xs tracking-wide text-black/50 uppercase">
                <th class="py-2 font-bold">
                  {{ t('billing.invoice.description') }}
                </th>
                <th class="py-2 text-right font-bold">
                  {{ t('billing.invoice.amount') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-black/5 align-top">
                <td class="py-2 pr-2">
                  <p class="font-semibold">
                    {{ invoice.levelName }}
                    <span
                      v-if="invoice.kind === 'renewal'"
                      class="text-xs font-normal text-black/60"
                    >({{ t('billing.invoice.renewal') }})</span>
                  </p>
                  <p class="text-xs text-black/60">
                    {{ t('billing.invoice.planLine', { plan: invoice.planName, duration: invoice.durationLabel }) }}
                  </p>
                  <p
                    v-if="invoice.periodStartsAt && invoice.periodEndsAt"
                    class="text-xs text-black/60"
                  >
                    {{ t('billing.invoice.period') }}: {{ t('billing.invoice.periodValue', { start: date(invoice.periodStartsAt), end: date(invoice.periodEndsAt) }) }}
                  </p>
                </td>
                <td class="py-2 text-right">
                  {{ money(invoice.amount, invoice.currency) }}
                </td>
              </tr>
            </tbody>
          </table>

          <dl class="mt-4 ml-auto w-full max-w-xs text-sm">
            <div class="flex justify-between border-t border-black/10 pt-1 text-base font-bold">
              <dt>{{ t('billing.invoice.total') }}</dt>
              <dd>{{ money(invoice.amount, invoice.currency) }}</dd>
            </div>
          </dl>

          <section
            v-if="invoice.transactions.length > 0"
            class="mt-6"
          >
            <h2 class="mb-2 text-xs font-bold tracking-wide text-black/50 uppercase">
              {{ t('billing.invoice.payments') }}
            </h2>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-black/10 text-left text-xs text-black/50">
                  <th class="py-1.5 font-bold">
                    {{ t('billing.invoice.date') }}
                  </th>
                  <th class="py-1.5 font-bold">
                    {{ t('billing.invoice.method') }}
                  </th>
                  <th class="py-1.5 font-bold">
                    {{ t('billing.invoice.reference') }}
                  </th>
                  <th class="py-1.5 text-right font-bold">
                    {{ t('billing.invoice.amount') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="transaction in invoice.transactions"
                  :key="transaction.id"
                  class="border-b border-black/5"
                >
                  <td class="py-1.5">
                    {{ date(transaction.paidAt) }}
                  </td>
                  <td class="py-1.5">
                    {{ transaction.methodName ?? '—' }}
                  </td>
                  <td class="py-1.5 break-all">
                    {{ transaction.reference ?? '—' }}
                  </td>
                  <td class="py-1.5 text-right">
                    {{ money(transaction.amount, transaction.currency) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>

        <BillingPaymentOptions
          v-if="invoice.canPay"
          :invoice="invoice"
          class="h-fit print:hidden"
          @updated="onUpdated"
        />
      </div>
    </template>
  </div>
</template>
