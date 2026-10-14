<script setup lang="ts">
// Auto-imported as <UiLocationPicker />. Replaces the free-text "your
// location" field with the Philippines Province -> City/Municipality ->
// Barangay cascade the client's spec doc calls for, backed by the real
// vendored dataset served through `/api/locations/*` (see
// `server/utils/phLocations.ts`).
//
// Two presentations, two ways of cascading:
//
// `default`/`bare` render a compact trigger + popover (built the same
// combobox-button pattern as `UiSelectSearch`) so it drops into a search
// bar/compact filter without changing its shape. It's a step wizard — only
// the current step's field is in the popover, so it stays short instead of
// growing tall enough to run under whatever section follows it on the page.
// Picking a value advances to the next step automatically; `Back` returns to
// an earlier step without losing it, and `Next` re-advances from there
// without forcing a re-pick.
//
// `inline` (the persistent filter sidebar) skips the trigger/popover and the
// step machinery entirely — a sidebar has the room to just show every
// reached field at once. Province is always visible; City appears once a
// province is picked; Barangay (optional) appears once a city is picked.
// Changing an earlier field doesn't hide it, but does invalidate what came
// after it the same way the popover's cascading-clear does (picking a new
// province clears City/Barangay, so Barangay's `v-if` drops it back out of
// view until a city is picked again).
//
// `form` (a profile/settings form, e.g. `pages/profile.vue`) is the third
// cascade style: every field is always visible AND required, so hiding one
// would just look broken next to the form's other always-visible required
// fields. Instead City/Barangay stay in place but `disabled` until their
// prerequisite is picked — same cascading-clear as the other variants
// otherwise. It renders as sibling grid cells (no wrapping element) so it
// drops straight into a caller's own `grid` layout alongside its other
// fields.
interface LocationOption {
  code: string
  name: string
  slug?: string
}

withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    variant?: 'default' | 'bare' | 'inline' | 'form'
  }>(),
  {
    id: undefined,
    placeholder: undefined,
    variant: 'default',
  },
)

const { t } = useI18n()

const provinceCode = defineModel<string | null>('province', { default: null })
const cityCode = defineModel<string | null>('city', { default: null })
const barangay = defineModel<string | null>('barangay', { default: null })

const isOpen = ref(false)
const rootRef = useTemplateRef('rootRef')

// The provinces list never varies by instance/query, so it's safe (and
// desirable) to share one cached fetch across every picker on the page —
// but cities/barangays depend on THIS picker's own province/city selection,
// so each instance needs its own key or two pickers on the same page (e.g.
// the search bar's and the filter sidebar's) would stomp on each other's
// cached results.
const uid = useId()

const { data: provinces } = useApi<LocationOption[]>('/locations/provinces', {
  key: 'ph-provinces',
  default: () => [],
})
// Not requested until there is a province/city to list them for (the answer would be an empty list, on every
// page and every picker, including during SSR); a later pick changes the query, which fetches them.
const { data: cities } = useApi<LocationOption[]>('/locations/cities', {
  key: `ph-cities-${uid}`,
  query: computed(() => ({ province: provinceCode.value ?? undefined })),
  immediate: !!provinceCode.value,
  default: () => [],
})
const { data: barangays } = useApi<{ name: string }[]>('/locations/barangays', {
  key: `ph-barangays-${uid}`,
  query: computed(() => ({ city: cityCode.value ?? undefined })),
  immediate: !!cityCode.value,
  default: () => [],
})

const provinceOptions = computed(() => (provinces.value ?? []).map(p => ({ value: p.code, label: p.name })))
const cityOptions = computed(() => (cities.value ?? []).map(c => ({ value: c.code, label: c.name })))
const barangayOptions = computed(() => (barangays.value ?? []).map(b => ({ value: b.name, label: b.name })))

// Cascading clear: picking a new province invalidates any city/barangay
// chosen under the previous one.
watch(provinceCode, () => {
  cityCode.value = null
  barangay.value = null
})
watch(cityCode, () => {
  barangay.value = null
})

const provinceName = computed(() => provinces.value?.find(p => p.code === provinceCode.value || (p.slug && p.slug === provinceCode.value))?.name ?? null)
const cityName = computed(() => cities.value?.find(c => c.code === cityCode.value || (c.slug && c.slug === cityCode.value))?.name ?? null)

const summary = computed(() => {
  const parts = [provinceName.value, cityName.value, barangay.value].filter((part): part is string => !!part)
  return parts.length > 0 ? parts.join(', ') : null
})

const STEP_ORDER = ['province', 'city', 'barangay'] as const
type Step = (typeof STEP_ORDER)[number]

// Resume at the first not-yet-chosen step (or the last one, once every step
// has a value) rather than always restarting at Province — used both as the
// initial step (so a picker mounted with query-prefilled province/city, e.g.
// on `/browse`, opens straight to the right step) and again each time the
// popover variant opens.
function furthestAvailableStep(): Step {
  if (!provinceCode.value) return 'province'
  if (!cityCode.value) return 'city'
  return 'barangay'
}

const currentStep = ref<Step>(furthestAvailableStep())
const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

function openPicker() {
  currentStep.value = furthestAvailableStep()
  isOpen.value = true
}

function togglePicker() {
  if (isOpen.value) isOpen.value = false
  else openPicker()
}

function goBack() {
  if (currentStep.value === 'barangay') currentStep.value = 'city'
  else if (currentStep.value === 'city') currentStep.value = 'province'
}

function goNext() {
  if (currentStep.value === 'province' && provinceCode.value) currentStep.value = 'city'
  else if (currentStep.value === 'city' && cityCode.value) currentStep.value = 'barangay'
}

const canGoNext = computed(() => {
  if (currentStep.value === 'province') return !!provinceCode.value
  if (currentStep.value === 'city') return !!cityCode.value
  return false
})

// These wrap the raw v-models so picking a *new* value both sets it and
// auto-advances the wizard — but re-selecting the value already there (e.g.
// after `goBack`) or clearing it via the select's own "x" doesn't, so the
// step stays put for the user to actually look at/change it.
const provinceStepModel = computed<string | null>({
  get: () => provinceCode.value,
  set: (value) => {
    const changed = value !== provinceCode.value
    provinceCode.value = value
    if (changed && value) currentStep.value = 'city'
  },
})
const cityStepModel = computed<string | null>({
  get: () => cityCode.value,
  set: (value) => {
    const changed = value !== cityCode.value
    cityCode.value = value
    if (changed && value) currentStep.value = 'barangay'
  },
})
const barangayStepModel = computed<string | null>({
  get: () => barangay.value,
  set: (value) => {
    barangay.value = value
    // Barangay is the last, optional step — picking one completes the flow.
    if (value) isOpen.value = false
  },
})

function clearAll() {
  provinceCode.value = null
  cityCode.value = null
  barangay.value = null
  currentStep.value = 'province'
}

onClickOutside(rootRef, () => (isOpen.value = false))
</script>

<template>
  <div
    v-if="variant === 'inline'"
    ref="rootRef"
    class="flex flex-col gap-3.5"
  >
    <div>
      <label
        :for="`${id}-province`"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('marketplace.search.provinceLabel') }}</label>
      <UiSelectSearch
        :id="`${id}-province`"
        v-model="provinceCode"
        :options="provinceOptions"
        :placeholder="t('marketplace.search.provincePlaceholder')"
      />
    </div>

    <div v-if="provinceCode">
      <label
        :for="`${id}-city`"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('marketplace.search.cityLabel') }}</label>
      <UiSelectSearch
        :id="`${id}-city`"
        v-model="cityCode"
        :options="cityOptions"
        :placeholder="t('marketplace.search.cityPlaceholder')"
      />
    </div>

    <div v-if="cityCode">
      <label
        :for="`${id}-barangay`"
        class="mb-1.5 block text-xs font-bold"
      >
        {{ t('marketplace.search.barangayLabel') }}
        <span class="font-normal text-black/40 dark:text-white/40">({{ t('marketplace.search.optional') }})</span>
      </label>
      <UiSelectSearch
        :id="`${id}-barangay`"
        v-model="barangay"
        :options="barangayOptions"
        :placeholder="t('marketplace.search.barangayPlaceholder')"
      />
    </div>

    <button
      v-if="summary"
      type="button"
      class="self-start text-xs font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
      @click="clearAll"
    >
      {{ t('marketplace.search.clearLocation') }}
    </button>
  </div>

  <template v-else-if="variant === 'form'">
    <div>
      <label
        :for="`${id}-province`"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('marketplace.search.provinceLabel') }} <span
        class="text-red-600 dark:text-red-400"
        aria-hidden="true"
      >*</span></label>
      <UiSelectSearch
        :id="`${id}-province`"
        v-model="provinceCode"
        :options="provinceOptions"
        :placeholder="t('marketplace.search.provincePlaceholder')"
      />
    </div>

    <div>
      <label
        :for="`${id}-city`"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('marketplace.search.cityLabel') }} <span
        class="text-red-600 dark:text-red-400"
        aria-hidden="true"
      >*</span></label>
      <UiSelectSearch
        :id="`${id}-city`"
        v-model="cityCode"
        :options="cityOptions"
        :disabled="!provinceCode"
        :placeholder="t('marketplace.search.cityPlaceholder')"
      />
    </div>

    <div>
      <label
        :for="`${id}-barangay`"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('marketplace.search.barangayLabel') }} <span
        class="text-red-600 dark:text-red-400"
        aria-hidden="true"
      >*</span></label>
      <UiSelectSearch
        :id="`${id}-barangay`"
        v-model="barangay"
        :options="barangayOptions"
        :disabled="!cityCode"
        :placeholder="t('marketplace.search.barangayPlaceholder')"
      />
    </div>
  </template>

  <div
    v-else
    ref="rootRef"
    class="relative"
  >
    <button
      :id="id"
      type="button"
      class="flex w-full items-center gap-2.5 text-left text-sm outline-none"
      :class="variant === 'bare'
        ? ''
        : 'rounded-xl border border-black/10 bg-white px-4 py-3 focus-within:border-brand-500 dark:border-white/10 dark:bg-white/5'"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="togglePicker"
    >
      <UiIcon
        name="map-pin"
        :size="16"
        class="shrink-0 text-black/40 dark:text-white/40"
      />
      <span
        class="min-w-0 flex-1 truncate"
        :class="summary ? 'text-black dark:text-white' : 'text-black/40 dark:text-white/40'"
      >{{ summary ?? (placeholder ?? t('marketplace.search.locationPlaceholder')) }}</span>
      <UiIcon
        name="chevron-down"
        :size="16"
        class="shrink-0 text-black/40 transition-transform dark:text-white/40"
        :class="isOpen && 'rotate-180'"
      />
    </button>

    <div
      v-if="isOpen"
      class="absolute z-30 mt-4.5 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-black"
    >
      <div class="mb-2.5 flex items-center justify-between gap-2">
        <button
          v-if="stepIndex > 0"
          type="button"
          class="inline-flex items-center gap-0.5 text-xs font-bold text-brand-700 hover:text-brand-800 dark:text-brand-100 dark:hover:text-brand-50"
          @click="goBack"
        >
          <UiIcon
            name="chevron-left"
            :size="14"
          />
          {{ t('marketplace.search.back') }}
        </button>
        <span v-else />
        <button
          v-if="summary"
          type="button"
          class="text-xs font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          @click="clearAll"
        >
          {{ t('marketplace.search.clearLocation') }}
        </button>
      </div>

      <div
        class="mb-3 flex gap-1.5"
        role="presentation"
      >
        <span
          v-for="(step, index) in STEP_ORDER"
          :key="step"
          class="h-1 flex-1 rounded-full"
          :class="index <= stepIndex ? 'bg-brand-600' : 'bg-black/10 dark:bg-white/10'"
        />
      </div>
      <p class="sr-only">
        {{ t('marketplace.search.stepOf', { current: stepIndex + 1, total: STEP_ORDER.length }) }}
      </p>

      <div v-if="currentStep === 'province'">
        <label
          :for="`${id}-province`"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('marketplace.search.provinceLabel') }}</label>
        <UiSelectSearch
          :id="`${id}-province`"
          v-model="provinceStepModel"
          :options="provinceOptions"
          :placeholder="t('marketplace.search.provincePlaceholder')"
        />
      </div>
      <div v-else-if="currentStep === 'city'">
        <label
          :for="`${id}-city`"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('marketplace.search.cityLabel') }}</label>
        <UiSelectSearch
          :id="`${id}-city`"
          v-model="cityStepModel"
          :options="cityOptions"
          :placeholder="t('marketplace.search.cityPlaceholder')"
        />
      </div>
      <div v-else>
        <label
          :for="`${id}-barangay`"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('marketplace.search.barangayLabel') }}</label>
        <UiSelectSearch
          :id="`${id}-barangay`"
          v-model="barangayStepModel"
          :options="barangayOptions"
          :placeholder="t('marketplace.search.barangayPlaceholder')"
        />
      </div>

      <div
        v-if="currentStep !== 'barangay' && canGoNext"
        class="mt-3 flex justify-end"
      >
        <UiButton
          variant="ghost"
          size="sm"
          @click="goNext"
        >
          {{ t('marketplace.search.next') }}
        </UiButton>
      </div>
      <div
        v-else-if="currentStep === 'barangay'"
        class="mt-3 flex justify-end"
      >
        <UiButton
          variant="ghost"
          size="sm"
          @click="isOpen = false"
        >
          {{ t('marketplace.search.done') }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
