<script setup lang="ts">
import type { MessageMeta, Quote, QuotePayload, ServiceListing } from '#shared/types/dashboard'

// Auto-imported as <DashboardQuoteFormModal/>. The provider's "send a
// structured price" form — price, base hours, an hourly rate for extra work,
// WHEN the job would happen and WHERE, plus an optional note. It posts as a
// distinct quote card in the chat (see <DashboardQuoteCard/>); when the
// client accepts, that date/time/address become the real booking, so they are
// required here rather than guessed later. Also used to edit a still-pending
// quote (`quote` prop) and to start from a client's job request (`prefill`).
const props = defineProps<{
  open: boolean
  /** Active listings the provider can attach to the quote. */
  services?: ServiceListing[]
  /** Editing an existing pending quote instead of creating one. */
  quote?: Quote | null
  /** The client's job request, used to pre-fill date/time/address/service. */
  prefill?: MessageMeta | null
  submitting?: boolean
  /** Server-side field errors, keyed by the API field name. */
  errors?: Record<string, string>
}>()

const emit = defineEmits<{
  close: []
  submit: [QuotePayload]
}>()

const { t, locale } = useI18n()
const { symbol, money } = useSiteSettings()
const titleId = useId()

const EXPIRY_OPTIONS = [24, 48, 72, 168] as const

const basePriceUsd = ref(0)
const baseHours = ref(0)
const extraHourlyRateUsd = ref(0)
const note = ref('')
const scheduledAtLocal = ref('')
const address = ref('')
const serviceListingId = ref('')
// 0 = "keep the current expiry" (only offered while editing); anything else restarts the clock from now.
const KEEP_EXPIRY = 0
const expiresInHours = ref<number>(48)
const localError = ref('')

function resetForm() {
  localError.value = ''
  if (props.quote) {
    basePriceUsd.value = props.quote.basePriceUsd
    baseHours.value = props.quote.baseHours
    extraHourlyRateUsd.value = props.quote.extraHourlyRateUsd
    note.value = props.quote.note ?? ''
    scheduledAtLocal.value = props.quote.scheduledAt ? toDateTimeLocalValue(props.quote.scheduledAt) : ''
    address.value = props.quote.address ?? ''
    serviceListingId.value = props.quote.serviceListingId ?? ''
    expiresInHours.value = KEEP_EXPIRY
    return
  }

  basePriceUsd.value = 0
  baseHours.value = 0
  extraHourlyRateUsd.value = 0
  note.value = ''
  expiresInHours.value = 48
  // Start from what the client asked for, so the provider only has to add a price.
  const preferredDate = props.prefill?.preferredDate
  scheduledAtLocal.value = preferredDate ? `${preferredDate}T${props.prefill?.preferredTime ?? '09:00'}` : ''
  address.value = props.prefill?.address ?? ''
  serviceListingId.value = props.prefill?.serviceListingId ?? ''
}

watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
})

// A quote can't be set in the past; `min` also nudges the native picker.
const minDateTime = computed(() => toDateTimeLocalValue(new Date()))

const serviceOptions = computed(() => (props.services ?? []).filter(service => service.status === 'active'))

function parseAmount(value: string) {
  return Number(value.replace(/[^\d.]/g, '')) || 0
}

function parseWholeNumber(value: string) {
  return Math.min(24, Number(value.replace(/\D/g, '')) || 0)
}

function handleSubmit() {
  localError.value = ''
  if (basePriceUsd.value <= 0) {
    localError.value = t('dashboard.messages.quote.errors.price', { amount: money(0) })
    return
  }
  if (baseHours.value < 1) {
    localError.value = t('dashboard.messages.quote.errors.hours')
    return
  }
  const scheduledAt = fromDateTimeLocalValue(scheduledAtLocal.value)
  if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
    localError.value = t('dashboard.messages.quote.errors.date')
    return
  }

  emit('submit', {
    basePriceUsd: basePriceUsd.value,
    baseHours: baseHours.value,
    extraHourlyRateUsd: extraHourlyRateUsd.value,
    note: note.value.trim(),
    scheduledAt,
    address: address.value.trim(),
    serviceListingId: serviceListingId.value || null,
    expiresInHours: expiresInHours.value === KEEP_EXPIRY ? null : expiresInHours.value,
  })
}

const firstServerError = computed(() => Object.values(props.errors ?? {})[0] ?? '')
</script>

<template>
  <UiModal
    :open="open"
    :labelledby="titleId"
    @close="emit('close')"
  >
    <h2
      :id="titleId"
      class="mb-1.5 font-display text-xl font-bold"
    >
      {{ quote ? t('dashboard.messages.quote.editTitle') : t('dashboard.messages.quote.formTitle') }}
    </h2>
    <p class="mb-5 text-sm text-black/60 dark:text-white/60">
      {{ t('dashboard.messages.quote.formSubtitle') }}
    </p>

    <form
      class="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
      @submit.prevent="handleSubmit"
    >
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label
            for="quote-base-price"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.messages.quote.basePriceLabel') }}</label>
          <UiInput
            id="quote-base-price"
            :model-value="basePriceUsd ? `${symbol}${basePriceUsd}` : ''"
            inputmode="decimal"
            :placeholder="t('dashboard.messages.quote.basePricePlaceholder', { symbol })"
            @update:model-value="(v) => (basePriceUsd = parseAmount(v))"
          />
        </div>
        <div>
          <label
            for="quote-base-hours"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.messages.quote.baseHoursLabel') }}</label>
          <!-- Whole hours only (the server stores a small integer); non-digits are dropped as you type. -->
          <UiInput
            id="quote-base-hours"
            :model-value="baseHours ? String(baseHours) : ''"
            inputmode="numeric"
            :placeholder="t('dashboard.messages.quote.baseHoursPlaceholder')"
            @update:model-value="(v) => (baseHours = parseWholeNumber(v))"
          />
        </div>
      </div>

      <div>
        <label
          for="quote-when"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.messages.quote.whenLabel') }}</label>
        <input
          id="quote-when"
          v-model="scheduledAtLocal"
          type="datetime-local"
          :min="minDateTime"
          :lang="locale"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
        <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
          {{ t('dashboard.messages.quote.whenHelp') }}
        </p>
      </div>

      <div>
        <label
          for="quote-address"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.messages.quote.addressLabel') }}</label>
        <UiInput
          id="quote-address"
          v-model="address"
          icon="map-pin"
          maxlength="255"
          :placeholder="t('dashboard.messages.quote.addressPlaceholder')"
        />
      </div>

      <div v-if="serviceOptions.length > 0">
        <label
          for="quote-service"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.messages.quote.serviceLabel') }}</label>
        <select
          id="quote-service"
          v-model="serviceListingId"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="">
            {{ t('dashboard.messages.quote.serviceNone') }}
          </option>
          <option
            v-for="service in serviceOptions"
            :key="service.id"
            :value="service.id"
          >
            {{ service.title }}
          </option>
        </select>
      </div>

      <div>
        <label
          for="quote-extra-rate"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.messages.quote.extraRateLabel') }}</label>
        <UiInput
          id="quote-extra-rate"
          :model-value="extraHourlyRateUsd ? `${symbol}${extraHourlyRateUsd}` : ''"
          inputmode="decimal"
          :placeholder="t('dashboard.messages.quote.extraRatePlaceholder', { symbol })"
          @update:model-value="(v) => (extraHourlyRateUsd = parseAmount(v))"
        />
        <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
          {{ t('dashboard.messages.quote.extraRateHelp') }}
        </p>
      </div>

      <div>
        <label
          for="quote-note"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.messages.quote.noteLabel') }}</label>
        <textarea
          id="quote-note"
          v-model="note"
          rows="2"
          maxlength="255"
          :placeholder="t('dashboard.messages.quote.notePlaceholder')"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <div>
        <label
          for="quote-expiry"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.messages.quote.expiryLabel') }}</label>
        <select
          id="quote-expiry"
          v-model.number="expiresInHours"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option
            v-if="quote"
            :value="KEEP_EXPIRY"
          >
            {{ quote.expiresAt ? t('dashboard.messages.quote.expiry.keep', { when: formatDateTime(quote.expiresAt, locale) }) : t('dashboard.messages.quote.expiry.keepNoDate') }}
          </option>
          <option
            v-for="hours in EXPIRY_OPTIONS"
            :key="hours"
            :value="hours"
          >
            {{ t(`dashboard.messages.quote.expiry.h${hours}`) }}
          </option>
        </select>
      </div>

      <p
        v-if="localError || firstServerError"
        role="alert"
        class="text-sm font-semibold text-red-600 dark:text-red-400"
      >
        {{ localError || firstServerError }}
      </p>

      <div class="mt-1 flex justify-end gap-2.5">
        <UiButton
          type="button"
          variant="ghost"
          @click="emit('close')"
        >
          {{ t('dashboard.messages.quote.cancel') }}
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          :disabled="submitting"
        >
          {{ quote ? t('dashboard.messages.quote.saveChanges') : t('dashboard.messages.quote.send') }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
