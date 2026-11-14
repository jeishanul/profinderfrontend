<script setup lang="ts">
import type { Invoice } from '#shared/types/billing'

// Checkout for a verification level, like the shop's. Two steps on one page, chosen by the query:
// - `?plan=<id>` (from "Buy" / "Renew"): what the plan is and what it includes. Nothing is created until the provider
//   presses "Continue to payment", which raises the invoice and moves on to `?invoice=<number>`.
// - `?invoice=<number>` (also "Pay now" on an open invoice): the ways to pay it, next to the order summary. Once a
//   payment is reported (bank transfer) or the invoice can no longer be paid, the invoice page takes over.
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'provider'],
  hideBottomNav: true,
  // `?plan=` and `?invoice=` are different steps: give each its own component so nothing carries over.
  key: route => route.fullPath,
})

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const toast = useToast()
const route = useRoute()
const localePath = useLocalePath()

const target = subscriptionCheckoutTarget(route.query)

function invoicePath(number: string) {
  return localePath(`/billing/invoices/${encodeURIComponent(number)}`)
}

function date(value: string | null) {
  return value ? formatDate(value, locale.value) : '—'
}

// --- Step 1: a plan ---------------------------------------------------------------------------------------------
const { data: overview, status: overviewStatus, error: overviewError } = useBillingOverview(target?.kind === 'plan')
const choice = computed(() => target?.kind === 'plan' && overview.value ? findLevelPlan(overview.value.data.levels, target.planId) : null)
const gatewayNames = computed(() => (overview.value?.data.gateways ?? []).map(gateway => gateway.name).join(', '))

// A level already waiting on an invoice is paid through that invoice, never a second one.
watch(choice, async (found) => {
  const open = found?.level.openInvoice
  if (open) await navigateTo(localePath(subscriptionCheckoutPath({ kind: 'invoice', number: open.number })), { replace: true })
}, { immediate: true })

const creating = ref(false)
async function continueToPayment() {
  if (target?.kind !== 'plan' || creating.value) return
  creating.value = true
  try {
    const { data: invoice } = await useApiFetch<{ data: Invoice }>(`/api/dashboard/billing/plans/${target.planId}/purchase`, { method: 'POST' })
    // The level now has an open invoice; the sidebar's unpaid count changed too.
    refreshNuxtData(BILLING_OVERVIEW_KEY)
    await navigateTo(localePath(subscriptionCheckoutPath({ kind: 'invoice', number: invoice.number })), { replace: true })
  }
  catch (error) {
    toast.error(Object.values(apiFieldErrors(error))[0] ?? apiErrorMessage(error, t('billing.levels.purchaseFailed')))
    creating.value = false
  }
}

// --- Step 2: an invoice -----------------------------------------------------------------------------------------
const invoiceNumber = target?.kind === 'invoice' ? target.number : ''
const { data: invoiceResponse, status: invoiceStatus, error: invoiceError } = useApi<{ data: Invoice }>(
  `/dashboard/billing/invoices/${encodeURIComponent(invoiceNumber)}`,
  { key: `billing-checkout-${invoiceNumber}`, server: false, immediate: target?.kind === 'invoice' },
)
const invoice = computed(() => invoiceResponse.value?.data ?? null)

// Paid, cancelled or waiting for an admin: nothing left to check out, so show the invoice itself.
watch(invoice, async (current) => {
  if (current && !current.canPay) await navigateTo(invoicePath(current.number), { replace: true })
}, { immediate: true })

async function onPaymentReported(updated: Invoice) {
  refreshNuxtData(BILLING_OVERVIEW_KEY)
  await navigateTo(invoicePath(updated.number))
}

const loading = computed(() => (target?.kind === 'plan' && !overview.value && overviewStatus.value !== 'error')
  || (target?.kind === 'invoice' && !invoice.value && invoiceStatus.value !== 'error'))
const failed = computed(() => (target?.kind === 'plan' && !!overviewError.value) || (target?.kind === 'invoice' && !!invoiceError.value))

useSeoMeta({
  title: () => t('billing.checkout.seoTitle'),
  description: () => t('billing.checkout.subtitle'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/billing" />
    <div>
      <h1 class="font-display text-2xl font-bold tracking-tight">
        {{ t('billing.checkout.title') }}
      </h1>
      <p class="mt-1 text-sm text-black/60 dark:text-white/60">
        {{ t('billing.checkout.subtitle') }}
      </p>
    </div>

    <div
      v-if="!target"
      class="rounded-2xl border border-dashed border-black/15 p-6 text-sm dark:border-white/15"
    >
      <p>{{ t('billing.checkout.missing') }}</p>
      <NuxtLinkLocale
        to="/billing"
        :class="[linkButtonClass('primary', 'sm'), 'mt-3']"
      >
        {{ t('billing.checkout.backToBilling') }}
      </NuxtLinkLocale>
    </div>

    <p
      v-else-if="failed"
      role="alert"
      class="text-sm text-red-700 dark:text-red-300"
    >
      {{ target.kind === 'plan' ? t('billing.loadFailed') : t('billing.invoice.loadFailed') }}
    </p>

    <div
      v-else-if="loading"
      class="h-80 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5"
      aria-hidden="true"
    />

    <!-- Step 1: review a plan before anything is created. -->
    <template v-else-if="target.kind === 'plan'">
      <div
        v-if="!choice"
        class="rounded-2xl border border-dashed border-black/15 p-6 text-sm dark:border-white/15"
      >
        <p>{{ t('billing.checkout.unavailable') }}</p>
        <NuxtLinkLocale
          to="/billing"
          :class="[linkButtonClass('primary', 'sm'), 'mt-3']"
        >
          {{ t('billing.checkout.backToBilling') }}
        </NuxtLinkLocale>
      </div>

      <div
        v-else
        class="grid gap-6 xl:grid-cols-[1fr_360px]"
      >
        <section class="flex flex-col gap-4 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
                {{ t('billing.checkout.review') }}
              </h2>
              <p class="mt-1 font-display text-lg font-bold">
                {{ choice.level.name }}
              </p>
              <p
                v-if="choice.level.badgeLabel"
                class="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-100"
              >
                <UiIcon
                  name="shield-check"
                  filled
                  :size="12"
                />{{ choice.level.badgeLabel }}
              </p>
            </div>
            <NuxtLinkLocale
              to="/billing"
              class="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-100"
            >
              {{ t('billing.checkout.changePlan') }}
            </NuxtLinkLocale>
          </div>

          <p
            v-if="choice.level.description"
            class="text-sm text-black/60 dark:text-white/60"
          >
            {{ choice.level.description }}
          </p>

          <div v-if="choice.level.inclusions.length > 0">
            <h3 class="mb-1.5 text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
              {{ t('billing.levels.includes') }}
            </h3>
            <ul class="flex flex-col gap-1.5 text-sm">
              <li
                v-for="inclusion in choice.level.inclusions"
                :key="inclusion"
                class="flex items-start gap-2"
              >
                <UiIcon
                  name="check"
                  :size="15"
                  class="mt-0.5 shrink-0 text-brand-600"
                />
                <span>{{ inclusion }}</span>
              </li>
            </ul>
          </div>

          <p
            v-if="gatewayNames"
            class="text-sm text-black/60 dark:text-white/60"
          >
            {{ t('billing.checkout.payWith', { methods: gatewayNames }) }}
          </p>
        </section>

        <aside class="flex h-fit flex-col gap-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 class="font-display text-base font-bold">
            {{ t('billing.checkout.summary') }}
          </h2>
          <div class="text-sm">
            <p class="font-semibold">
              {{ choice.level.name }}
            </p>
            <p class="text-xs text-black/60 dark:text-white/60">
              {{ t('billing.invoice.planLine', { plan: choice.plan.name, duration: choice.plan.durationLabel }) }}
            </p>
            <p class="text-xs text-black/60 dark:text-white/60">
              {{ choice.plan.isRecurring ? t('billing.levels.renewsAutomatically') : t('billing.levels.oneTime') }}
            </p>
          </div>
          <div class="flex justify-between border-t border-black/10 pt-3 text-base font-bold dark:border-white/10">
            <span>{{ t('billing.invoice.total') }}</span>
            <span>{{ money(choice.plan.price) }}</span>
          </div>
          <UiButton
            class="w-full py-3"
            :disabled="creating"
            @click="continueToPayment"
          >
            {{ creating ? t('billing.checkout.continuing') : t('billing.checkout.continue') }}
          </UiButton>
          <p class="text-xs text-black/50 dark:text-white/50">
            {{ t('billing.checkout.continueHint') }}
          </p>
        </aside>
      </div>
    </template>

    <!-- Step 2: pay the invoice. -->
    <div
      v-else-if="invoice && invoice.canPay"
      class="grid gap-6 xl:grid-cols-[1fr_360px]"
    >
      <BillingPaymentOptions
        :invoice="invoice"
        class="h-fit"
        @updated="onPaymentReported"
      />

      <aside class="flex h-fit flex-col gap-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 class="font-display text-base font-bold">
          {{ t('billing.checkout.summary') }}
        </h2>
        <div class="text-sm">
          <p class="font-semibold">
            {{ invoice.levelName }}
            <span
              v-if="invoice.kind === 'renewal'"
              class="text-xs font-normal text-black/60 dark:text-white/60"
            >({{ t('billing.invoice.renewal') }})</span>
          </p>
          <p class="text-xs text-black/60 dark:text-white/60">
            {{ t('billing.invoice.planLine', { plan: invoice.planName, duration: invoice.durationLabel }) }}
          </p>
          <p
            v-if="invoice.periodStartsAt && invoice.periodEndsAt"
            class="text-xs text-black/60 dark:text-white/60"
          >
            {{ t('billing.invoice.period') }}: {{ t('billing.invoice.periodValue', { start: date(invoice.periodStartsAt), end: date(invoice.periodEndsAt) }) }}
          </p>
        </div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-black/60 dark:text-white/60">
            {{ t('billing.invoice.dueDate') }}
          </dt>
          <dd
            class="text-right"
            :class="invoice.isOverdue && 'font-semibold text-red-700 dark:text-red-300'"
          >
            {{ date(invoice.dueAt) }}
          </dd>
        </dl>
        <div class="flex justify-between border-t border-black/10 pt-3 text-base font-bold dark:border-white/10">
          <span>{{ t('billing.invoice.total') }}</span>
          <span>{{ formatMoney(invoice.amount, invoice.currency, locale) }}</span>
        </div>
        <p class="text-xs text-black/50 dark:text-white/50">
          {{ t('billing.checkout.afterPayment') }}
        </p>
        <NuxtLinkLocale
          :to="`/billing/invoices/${encodeURIComponent(invoice.number)}`"
          class="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-100"
        >
          {{ t('billing.checkout.viewInvoice', { number: invoice.number }) }}
        </NuxtLinkLocale>
      </aside>
    </div>
  </div>
</template>
