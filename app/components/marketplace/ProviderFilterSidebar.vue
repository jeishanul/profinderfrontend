<script setup lang="ts">
import type { ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceProviderFilterSidebar />. The service picker
// is multi-select (checkable rows, like the rating filter below it) — a
// consumer can filter for several kinds of pro at once.
//
// Mounted twice on `browse.vue` — once as the always-present desktop aside,
// once inside the mobile `<UiBottomSheet>` (CSS-hidden at the breakpoint the
// other one shows at, per CLAUDE.md's mobile-first redesign) — so `idPrefix`
// keeps their form-control ids from colliding when both happen to be in the
// DOM at once, and `bare` drops the standalone card chrome (border/backdrop/
// padding) when the sheet already provides it.
withDefaults(
  defineProps<{
    categories: ServiceCategory[]
    idPrefix?: string
    bare?: boolean
  }>(),
  { idPrefix: 'filter-sidebar', bare: false },
)

const emit = defineEmits<{
  apply: []
  reset: []
}>()

const categoryIds = defineModel<string[]>('categoryIds', { default: () => [] })
const provinceCode = defineModel<string | null>('province', { default: null })
const cityCode = defineModel<string | null>('city', { default: null })
const barangay = defineModel<string | null>('barangay', { default: null })
const minRating = defineModel<number>('minRating', { default: 0 })
const verifiedOnly = defineModel<boolean>('verifiedOnly', { default: false })
const minPrice = defineModel<number>('minPrice', { default: PRICE_MIN })
const maxPrice = defineModel<number>('maxPrice', { default: PRICE_MAX })

const { t } = useI18n()

const RATING_OPTIONS = [5, 4, 3, 2, 1] as const

function toggleCategory(id: string) {
  categoryIds.value = categoryIds.value.includes(id)
    ? categoryIds.value.filter(existing => existing !== id)
    : [...categoryIds.value, id]
}

function resetAll() {
  categoryIds.value = []
  provinceCode.value = null
  cityCode.value = null
  barangay.value = null
  minRating.value = 0
  verifiedOnly.value = false
  minPrice.value = PRICE_MIN
  maxPrice.value = PRICE_MAX
  emit('reset')
}
</script>

<template>
  <component
    :is="bare ? 'div' : 'aside'"
    :class="bare ? '' : 'rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-black/30'"
  >
    <div class="mb-5 flex items-center justify-between">
      <div class="flex items-center gap-2 font-bold">
        <UiIcon
          name="sliders"
          :size="17"
          class="text-brand-700"
        />
        {{ t('marketplace.filters.heading') }}
      </div>
      <button
        type="button"
        class="text-sm font-semibold text-brand-700 hover:text-brand-800"
        @click="resetAll"
      >
        {{ t('marketplace.filters.resetAll') }}
      </button>
    </div>

    <div class="mb-6">
      <p class="mb-2.5 text-xs font-bold uppercase tracking-wide text-black/50 dark:text-white/50">
        {{ t('marketplace.filters.location') }}
      </p>
      <UiLocationPicker
        :id="`${idPrefix}-location`"
        v-model:province="provinceCode"
        v-model:city="cityCode"
        v-model:barangay="barangay"
        variant="inline"
      />
    </div>

    <div class="mb-6">
      <p class="mb-2.5 text-xs font-bold uppercase tracking-wide text-black/50 dark:text-white/50">
        {{ t('marketplace.filters.service') }}
      </p>
      <div class="flex flex-col gap-1">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors"
          :class="categoryIds.includes(cat.id)
            ? 'bg-brand-50 dark:bg-brand-700/20'
            : 'hover:bg-black/5 dark:hover:bg-white/10'"
          :aria-pressed="categoryIds.includes(cat.id)"
          @click="toggleCategory(cat.id)"
        >
          <span
            class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors"
            :class="categoryIds.includes(cat.id)
              ? 'border-brand-600 bg-brand-600'
              : 'border-black/20 dark:border-white/25'"
          >
            <UiIcon
              v-if="categoryIds.includes(cat.id)"
              name="check"
              :size="11"
              class="text-white"
            />
          </span>
          <span
            class="text-sm font-semibold"
            :class="categoryIds.includes(cat.id) ? 'text-brand-700 dark:text-brand-100' : 'text-black/70 dark:text-white/70'"
          >
            {{ t(`marketplace.categories.${cat.id}.label`) }}
          </span>
        </button>
      </div>
    </div>

    <div class="mb-6">
      <p class="mb-2.5 text-xs font-bold uppercase tracking-wide text-black/50 dark:text-white/50">
        {{ t('marketplace.filters.minRating') }}
      </p>
      <div class="flex flex-col gap-1">
        <button
          v-for="rating in RATING_OPTIONS"
          :key="rating"
          type="button"
          class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors"
          :class="minRating === rating
            ? 'bg-brand-50 dark:bg-brand-700/20'
            : 'hover:bg-black/5 dark:hover:bg-white/10'"
          :aria-pressed="minRating === rating"
          @click="minRating = minRating === rating ? 0 : rating"
        >
          <span class="flex gap-0.5">
            <UiIcon
              v-for="star in 5"
              :key="star"
              name="star"
              :filled="star <= rating"
              :size="25"
              :class="star <= rating ? 'text-accent-600' : 'text-black/15 dark:text-white/20'"
            />
          </span>
          <span
            class="text-sm font-semibold"
            :class="minRating === rating ? 'text-brand-700 dark:text-brand-100' : 'text-black/70 dark:text-white/70'"
          >
            {{ t('marketplace.filters.ratingAndUp', { rating }) }}
          </span>
        </button>
      </div>
    </div>

    <fieldset class="mb-6 border-0 p-0">
      <legend class="mb-2.5 text-xs font-bold uppercase tracking-wide text-black/50 dark:text-white/50">
        {{ t('marketplace.filters.priceRange') }}
      </legend>
      <div class="flex items-center gap-3">
        <div class="flex flex-1 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 focus-within:border-brand-500 dark:border-white/10 dark:bg-white/5">
          <label
            :for="`${idPrefix}-min-price`"
            class="sr-only"
          >{{ t('marketplace.filters.minPriceLabel') }}</label>
          <span class="text-sm text-black/40 dark:text-white/40">$</span>
          <input
            :id="`${idPrefix}-min-price`"
            v-model.number="minPrice"
            type="number"
            :min="PRICE_MIN"
            :max="PRICE_MAX"
            inputmode="numeric"
            class="w-full bg-transparent text-sm text-black outline-none dark:text-white"
          >
        </div>
        <span
          class="text-black/30 dark:text-white/30"
          aria-hidden="true"
        >&ndash;</span>
        <div class="flex flex-1 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 focus-within:border-brand-500 dark:border-white/10 dark:bg-white/5">
          <label
            :for="`${idPrefix}-max-price`"
            class="sr-only"
          >{{ t('marketplace.filters.maxPriceLabel') }}</label>
          <span class="text-sm text-black/40 dark:text-white/40">$</span>
          <input
            :id="`${idPrefix}-max-price`"
            v-model.number="maxPrice"
            type="number"
            :min="PRICE_MIN"
            :max="PRICE_MAX"
            inputmode="numeric"
            class="w-full bg-transparent text-sm text-black outline-none dark:text-white"
          >
        </div>
      </div>

      <div class="mt-4 px-1">
        <UiRangeSlider
          v-model:from="minPrice"
          v-model:to="maxPrice"
          :min="PRICE_MIN"
          :max="PRICE_MAX"
          :label-from="t('marketplace.filters.minPriceLabel')"
          :label-to="t('marketplace.filters.maxPriceLabel')"
        />
      </div>

      <p class="mt-1.5 text-sm text-black/50 dark:text-white/50">
        {{ t('marketplace.filters.perHourSuffix') }}
      </p>
    </fieldset>

    <label
      :for="`${idPrefix}-verified`"
      class="flex cursor-pointer items-center justify-between border-t border-black/10 pt-5 dark:border-white/10"
    >
      <span class="text-sm font-semibold">{{ t('marketplace.filters.verifiedOnly') }}</span>
      <span
        class="relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-full transition-colors"
        :class="verifiedOnly ? 'bg-brand-600' : 'bg-black/15 dark:bg-white/20'"
      >
        <input
          :id="`${idPrefix}-verified`"
          v-model="verifiedOnly"
          type="checkbox"
          class="absolute inset-0 opacity-0"
        >
        <span
          class="inline-block h-[18px] w-[18px] translate-x-[3px] rounded-full bg-white transition-transform"
          :class="verifiedOnly ? 'translate-x-[21px]' : ''"
        />
      </span>
    </label>

    <UiButton
      class="mt-6 w-full justify-center"
      @click="emit('apply')"
    >
      {{ t('marketplace.filters.apply') }}
    </UiButton>
  </component>
</template>
