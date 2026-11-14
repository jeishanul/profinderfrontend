<script setup lang="ts">
import type { VerificationLevel, VerificationSubscription } from '#shared/types/billing'

// Auto-imported as <BillingLevelCard/>. One verification level on the Billing page: what it includes (or, for the
// free Level 1, what it checks), where the provider stands with it, its badge, and its plans with a Buy / Renew
// button. Choosing a plan opens the checkout (`/subscription/checkout?plan=`), where the invoice is created once the
// provider confirms; an open invoice replaces the plans with "Pay now", which opens the checkout for that invoice.
const props = defineProps<{
  level: VerificationLevel
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const toast = useToast()
const localePath = useLocalePath()

const status = computed(() => levelStatus(props.level))
const statusText = computed(() => {
  const { key, date } = status.value
  if (key === 'free' || key === 'notPurchased') return t(`billing.levels.status.${key}`)
  return date
    ? t(`billing.levels.status.${key}`, { date: formatDate(date, locale.value) })
    : t(`billing.levels.status.${key}NoDate`)
})
const statusVariant = computed<'primary' | 'accent' | 'danger' | 'neutral'>(() => {
  switch (status.value.key) {
    case 'active':
    case 'grandfathered':
    case 'admin':
    case 'free':
      return 'primary'
    case 'expired':
      return 'danger'
    default:
      return 'neutral'
  }
})

const badge = computed(() => badgeState(props.level))
const progress = computed(() => requirementProgress(props.level.requirements))

const openInvoiceKey = computed(() => {
  const invoice = props.level.openInvoice
  if (!invoice) return null
  return invoiceStatusKey(invoice) === 'overdue' ? 'overdue' : invoice.status === 'pending_review' ? 'pendingReview' : 'unpaid'
})

const selectedPlanId = ref<number | null>(defaultPlanId(props.level))
watch(() => props.level.plans, () => {
  if (!props.level.plans.some(plan => plan.id === selectedPlanId.value)) selectedPlanId.value = defaultPlanId(props.level)
})

const canBuy = computed(() => !props.level.isFree && props.level.isOnSale && props.level.plans.length > 0 && !props.level.openInvoice)
const buyLabel = computed(() => props.level.subscription ? t('billing.levels.renew') : t('billing.levels.buy'))

const buying = ref(false)
async function buy() {
  if (selectedPlanId.value === null) return
  buying.value = true
  await navigateTo(localePath(subscriptionCheckoutPath({ kind: 'plan', planId: selectedPlanId.value })))
}

const showAutoRenew = computed(() => props.level.subscription?.state === 'active' && props.level.subscription.planIsRecurring)
const autoRenew = ref(props.level.subscription?.autoRenew ?? false)
watch(() => props.level.subscription?.autoRenew, (value) => {
  autoRenew.value = value ?? false
})
const savingAutoRenew = ref(false)
async function setAutoRenew(value: boolean) {
  const previous = autoRenew.value
  autoRenew.value = value
  savingAutoRenew.value = true
  try {
    await useApiFetch<{ data: VerificationSubscription }>(`/api/dashboard/billing/levels/${props.level.id}/auto-renew`, { method: 'PATCH', body: { autoRenew: value } })
    toast.success(value ? t('billing.levels.autoRenewOn') : t('billing.levels.autoRenewOff'))
    emit('changed')
  }
  catch (error) {
    autoRenew.value = previous
    toast.error(apiErrorMessage(error, t('billing.levels.autoRenewFailed')))
  }
  finally {
    savingAutoRenew.value = false
  }
}
</script>

<template>
  <article class="flex flex-col gap-4 rounded-2xl border border-black/10 p-5 dark:border-white/10">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="font-display text-base font-bold">
          {{ level.name }}
        </h3>
        <p
          v-if="level.badgeLabel"
          class="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-100"
        >
          <UiIcon
            name="shield-check"
            filled
            :size="12"
          />{{ level.badgeLabel }}
        </p>
      </div>
      <UiTag
        :variant="statusVariant"
        size="sm"
      >
        {{ statusText }}
      </UiTag>
    </header>

    <p
      v-if="level.description"
      class="text-sm text-black/60 dark:text-white/60"
    >
      {{ level.description }}
    </p>

    <div v-if="level.isFree && level.basicChecks.length > 0">
      <h4 class="mb-1.5 text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
        {{ t('billing.levels.basicChecks') }}
      </h4>
      <ul class="flex flex-col gap-1.5 text-sm">
        <li
          v-for="check in level.basicChecks"
          :key="check.key"
          class="flex items-center gap-2"
        >
          <UiIcon
            :name="check.done ? 'check-circle' : 'x'"
            :size="15"
            :class="check.done ? 'text-brand-600' : 'text-black/30 dark:text-white/30'"
          />
          <span>{{ check.label }}</span>
          <UiTag
            v-if="!check.required"
            size="sm"
          >
            {{ t('billing.levels.recommended') }}
          </UiTag>
          <span class="sr-only">({{ check.done ? t('billing.levels.done') : t('billing.levels.notDone') }})</span>
        </li>
      </ul>
    </div>

    <div v-else-if="level.inclusions.length > 0">
      <h4 class="mb-1.5 text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
        {{ t('billing.levels.includes') }}
      </h4>
      <ul class="flex flex-col gap-1.5 text-sm">
        <li
          v-for="inclusion in level.inclusions"
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
      v-if="level.isFree"
      class="text-sm font-bold"
    >
      {{ t('billing.levels.free') }}
    </p>

    <div
      v-if="badge === 'onProfile'"
      class="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 dark:bg-brand-700/20 dark:text-brand-100"
    >
      <UiIcon
        name="check-circle"
        :size="16"
      />
      {{ t('billing.levels.badge.onProfile') }}
    </div>
    <div
      v-else-if="badge === 'waitingDocuments'"
      class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent-50 px-3 py-2 text-sm dark:bg-accent-700/20"
    >
      <span class="font-semibold text-accent-700 dark:text-accent-100">
        {{ t('billing.levels.badge.waiting', progress) }}
      </span>
      <NuxtLinkLocale
        :to="{ path: '/profile', query: { tab: 'kyc' } }"
        class="font-semibold text-brand-700 hover:underline dark:text-brand-100"
      >
        {{ t('billing.levels.badge.upload') }}
      </NuxtLinkLocale>
    </div>

    <div
      v-if="showAutoRenew"
      class="flex items-center justify-between gap-3 border-t border-black/10 pt-3 dark:border-white/10"
    >
      <div class="text-sm">
        <p class="font-semibold">
          {{ t('billing.levels.autoRenew') }}
        </p>
        <p class="text-xs text-black/60 dark:text-white/60">
          {{ t('billing.levels.autoRenewHint') }}
        </p>
      </div>
      <UiToggleSwitch
        :model-value="autoRenew"
        :label="t('billing.levels.autoRenew')"
        :disabled="savingAutoRenew"
        @update:model-value="setAutoRenew"
      />
    </div>

    <div
      v-if="level.openInvoice && openInvoiceKey"
      class="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-600/30 bg-accent-50/60 p-3 text-sm dark:bg-accent-700/10"
    >
      <span class="font-semibold">{{ t(`billing.levels.openInvoice.${openInvoiceKey}`, { number: level.openInvoice.number }) }}</span>
      <NuxtLinkLocale
        :to="level.openInvoice.status === 'unpaid'
          ? subscriptionCheckoutPath({ kind: 'invoice', number: level.openInvoice.number })
          : `/billing/invoices/${encodeURIComponent(level.openInvoice.number)}`"
        :class="linkButtonClass(level.openInvoice.status === 'unpaid' ? 'primary' : 'secondary', 'sm')"
      >
        {{ level.openInvoice.status === 'unpaid' ? t('billing.levels.openInvoice.pay') : t('billing.levels.openInvoice.view') }}
      </NuxtLinkLocale>
    </div>

    <form
      v-else-if="canBuy"
      class="mt-auto flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10"
      @submit.prevent="buy"
    >
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1.5 text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
          {{ t('billing.levels.choosePlan', { level: level.name }) }}
        </legend>
        <label
          v-for="plan in level.plans"
          :key="plan.id"
          :for="`plan-${level.id}-${plan.id}`"
          class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors"
          :class="selectedPlanId === plan.id ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-700/10' : 'border-black/10 dark:border-white/10'"
        >
          <input
            :id="`plan-${level.id}-${plan.id}`"
            v-model="selectedPlanId"
            type="radio"
            :name="`plan-${level.id}`"
            :value="plan.id"
            class="accent-brand-600"
          >
          <span class="min-w-0 flex-1">
            <span class="block font-semibold">{{ plan.name }} · {{ plan.durationLabel }}</span>
            <span class="block text-xs text-black/60 dark:text-white/60">
              {{ plan.isRecurring ? t('billing.levels.renewsAutomatically') : t('billing.levels.oneTime') }}
            </span>
          </span>
          <span class="shrink-0 font-bold">{{ money(plan.price) }}</span>
        </label>
      </fieldset>
      <UiButton
        type="submit"
        :disabled="buying || selectedPlanId === null"
        class="self-start"
      >
        {{ buyLabel }}
      </UiButton>
    </form>

    <p
      v-else-if="!level.isFree && !level.isOnSale"
      class="mt-auto text-xs text-black/60 dark:text-white/60"
    >
      {{ t('billing.levels.notOnSale') }}
    </p>
    <p
      v-else-if="!level.isFree && level.plans.length === 0"
      class="mt-auto text-xs text-black/60 dark:text-white/60"
    >
      {{ t('billing.levels.noPlans') }}
    </p>
  </article>
</template>
