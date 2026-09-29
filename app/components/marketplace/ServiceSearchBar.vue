<script setup lang="ts">
import type { ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceServiceSearchBar />. Used at full size in the
// landing hero, and again in compact form once it docks into the header (see
// `useHeroSearchDock`) and atop the browse results page.
const props = withDefaults(
  defineProps<{
    categories: ServiceCategory[]
    variant?: 'large' | 'compact'
  }>(),
  { variant: 'large' },
)

const emit = defineEmits<{
  submit: [{ category: string, province: string, city: string, barangay: string }]
}>()

const category = defineModel<string>('category', { default: '' })
const provinceCode = defineModel<string | null>('province', { default: null })
const cityCode = defineModel<string | null>('city', { default: null })
const barangay = defineModel<string | null>('barangay', { default: null })

const { t } = useI18n()

// Unique per instance — this component renders more than once at a time (the
// hero search and the header's docked copy both exist in the DOM together),
// so a fixed id would duplicate and break the label association.
const uid = useId()

const categoryOptions = computed(() =>
  props.categories.map(cat => ({ value: cat.id, label: t(`marketplace.categories.${cat.id}.label`) })),
)

// `category` stays a plain string ('' = none) so every existing caller
// (index.vue, browse.vue) keeps working unchanged — UiSelectSearch's null-based
// "nothing selected" API is bridged here, not pushed out to callers.
const categorySelectModel = computed<string | null>({
  get: () => category.value || null,
  set: value => (category.value = value ?? ''),
})

function handleSubmit() {
  emit('submit', {
    category: category.value,
    province: provinceCode.value ?? '',
    city: cityCode.value ?? '',
    barangay: barangay.value ?? '',
  })
}
</script>

<template>
  <!-- `large` (hero) stacks full-width below `sm` — cramming category +
       location + button into one pill-shaped row left both text fields
       truncated to "Wh…"/"Y…" on a phone (a real bug, confirmed in a
       390px-wide screenshot), and a full-width tappable row reads far more
       like a native search field than a squeezed segment anyway. `compact`
       (the header-docked copy, `md:flex` only — see AppHeader.vue) never
       renders below `md`, so it keeps the single-row pill unconditionally. -->
  <form
    class="relative z-10 rounded-3xl border border-black/10 bg-white/70 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/40"
    :class="variant === 'large' ? 'flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-1 sm:rounded-full sm:p-2' : 'flex items-center gap-1 rounded-full p-1'"
    @submit.prevent="handleSubmit"
  >
    <label
      :for="`${uid}-category`"
      class="flex flex-1 items-center gap-2.5 rounded-2xl px-4 py-3 min-w-0"
      :class="variant === 'large' ? 'bg-black/[0.03] sm:rounded-full sm:bg-transparent sm:py-2.5 dark:bg-white/[0.05] sm:dark:bg-transparent' : 'rounded-full py-2.5'"
    >
      <span class="sr-only">{{ t('marketplace.search.categoryLabel') }}</span>
      <UiIcon
        name="search"
        :size="16"
        class="shrink-0 text-black/40 dark:text-white/40"
      />
      <UiSelectSearch
        :id="`${uid}-category`"
        v-model="categorySelectModel"
        :options="categoryOptions"
        :placeholder="t('marketplace.search.categoryPlaceholder')"
        variant="bare"
        class="w-full"
      />
    </label>

    <div
      class="h-6 w-px shrink-0 bg-black/10 dark:bg-white/10"
      :class="variant === 'large' ? 'hidden sm:block' : ''"
    />

    <div
      class="flex-1 rounded-2xl px-4 py-3 min-w-0"
      :class="variant === 'large' ? 'bg-black/[0.03] sm:rounded-full sm:bg-transparent sm:py-2.5 dark:bg-white/[0.05] sm:dark:bg-transparent' : 'py-2.5'"
    >
      <UiLocationPicker
        :id="`${uid}-location`"
        v-model:province="provinceCode"
        v-model:city="cityCode"
        v-model:barangay="barangay"
        variant="bare"
      />
    </div>

    <UiButton
      type="submit"
      class="rounded-full!"
      :class="variant === 'compact' ? 'px-4! py-2! text-xs!' : 'w-full justify-center! sm:w-auto'"
    >
      <UiIcon
        name="search"
        :size="14"
      />
      {{ t('marketplace.search.submit') }}
    </UiButton>
  </form>
</template>
