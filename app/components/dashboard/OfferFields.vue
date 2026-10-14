<script setup lang="ts">
// Auto-imported as <DashboardOfferFields/>. The four things every price offer says: how much, for how many hours, when,
// and what extra hours cost. Shared by the chat quote form and the Seek Job application form, so a provider fills in the
// same fields (with the same wording) wherever they name a price.
defineProps<{
  /** Prefix for the inputs' ids, so two of these on a page never collide. */
  idPrefix: string
}>()

const price = defineModel<number>('price', { required: true })
const hours = defineModel<number>('hours', { required: true })
const extraRate = defineModel<number>('extraRate', { required: true })
/** `datetime-local` value: when the provider would do the job. */
const when = defineModel<string>('when', { required: true })

const { t, locale } = useI18n()
const { symbol } = useSiteSettings()

// A date in the past can't be offered; `min` also nudges the native picker.
const minDateTime = computed(() => toDateTimeLocalValue(new Date()))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label
          :for="`${idPrefix}-price`"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.messages.quote.basePriceLabel') }}</label>
        <UiInput
          :id="`${idPrefix}-price`"
          :model-value="price ? `${symbol}${price}` : ''"
          inputmode="decimal"
          :placeholder="t('dashboard.messages.quote.basePricePlaceholder', { symbol })"
          @update:model-value="(v) => (price = parseAmount(v))"
        />
      </div>
      <div>
        <label
          :for="`${idPrefix}-hours`"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.messages.quote.baseHoursLabel') }}</label>
        <!-- Whole hours only (the server stores a small integer); non-digits are dropped as you type. -->
        <UiInput
          :id="`${idPrefix}-hours`"
          :model-value="hours ? String(hours) : ''"
          inputmode="numeric"
          :placeholder="t('dashboard.messages.quote.baseHoursPlaceholder')"
          @update:model-value="(v) => (hours = parseWholeHours(v))"
        />
      </div>
    </div>

    <div>
      <label
        :for="`${idPrefix}-when`"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('dashboard.messages.quote.whenLabel') }}</label>
      <input
        :id="`${idPrefix}-when`"
        v-model="when"
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
        :for="`${idPrefix}-extra-rate`"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('dashboard.messages.quote.extraRateLabel') }}</label>
      <UiInput
        :id="`${idPrefix}-extra-rate`"
        :model-value="extraRate ? `${symbol}${extraRate}` : ''"
        inputmode="decimal"
        :placeholder="t('dashboard.messages.quote.extraRatePlaceholder', { symbol })"
        @update:model-value="(v) => (extraRate = parseAmount(v))"
      />
      <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
        {{ t('dashboard.messages.quote.extraRateHelp') }}
      </p>
    </div>
  </div>
</template>
