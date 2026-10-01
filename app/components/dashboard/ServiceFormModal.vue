<script setup lang="ts">
import type { ServiceCategory } from '#shared/types/marketplace'
import type { ServiceListing } from '#shared/types/dashboard'

// Auto-imported as <DashboardServiceFormModal/>. Add/edit form for a single
// service listing — `service: null` means "create new". `services.vue` owns
// the actual API calls (create/update); this only emits the form's values.
const props = defineProps<{
  open: boolean
  categories: ServiceCategory[]
  service: ServiceListing | null
  /** The save request is in flight. */
  submitting?: boolean
  /** Server validation errors, keyed by field name (`apiFieldErrors`). */
  errors?: Record<string, string>
}>()

export interface ServiceFormSubmitPayload {
  title: string
  categoryId: string
  description: string
  durationLabel: string
  priceType: 'flat' | 'hourly'
  priceAmount: number
}

const emit = defineEmits<{
  close: []
  submit: [ServiceFormSubmitPayload]
}>()

const { t } = useI18n()
const titleId = useId()

const PRICE_TYPE_OPTIONS = [
  { value: 'hourly', label: t('dashboard.services.form.priceTypeHourly') },
  { value: 'flat', label: t('dashboard.services.form.priceTypeFlat') },
]

const form = reactive({
  title: '',
  categoryId: null as string | null,
  description: '',
  durationLabel: '',
  priceType: 'hourly' as 'flat' | 'hourly',
  priceAmount: '',
})

function resetForm() {
  form.title = props.service?.title ?? ''
  form.categoryId = props.service?.categoryId ?? null
  form.description = props.service?.description ?? ''
  form.durationLabel = props.service?.durationLabel ?? ''
  form.priceType = props.service?.priceType ?? 'hourly'
  form.priceAmount = props.service ? String(props.service.priceAmount) : ''
}

watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
})

const categoryOptions = computed(() =>
  props.categories.map(category => ({ value: category.id, label: category.name })),
)

const fieldError = (field: string) => props.errors?.[field] ?? ''

const isValid = computed(() =>
  form.title.trim().length > 0
  && form.categoryId
  && form.description.trim().length > 0
  && form.durationLabel.trim().length > 0
  && Number(form.priceAmount) > 0,
)

function handleSubmit() {
  if (!isValid.value || !form.categoryId) return
  emit('submit', {
    title: form.title.trim(),
    categoryId: form.categoryId,
    description: form.description.trim(),
    durationLabel: form.durationLabel.trim(),
    priceType: form.priceType,
    priceAmount: Number(form.priceAmount),
  })
}
</script>

<template>
  <UiModal
    :open="open"
    :labelledby="titleId"
    @close="emit('close')"
  >
    <h2
      :id="titleId"
      class="mb-5 font-display text-xl font-bold"
    >
      {{ service ? t('dashboard.services.form.editTitle') : t('dashboard.services.form.addTitle') }}
    </h2>

    <form
      class="flex flex-col gap-4"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label
          for="service-form-title"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.services.form.titleLabel') }}</label>
        <UiInput
          id="service-form-title"
          v-model="form.title"
        />
        <p
          v-if="fieldError('title')"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ fieldError('title') }}
        </p>
      </div>

      <div>
        <label
          for="service-form-category"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.services.form.categoryLabel') }}</label>
        <UiSelectSearch
          id="service-form-category"
          v-model="form.categoryId"
          :options="categoryOptions"
          :placeholder="t('dashboard.services.form.categoryPlaceholder')"
        />
        <p
          v-if="fieldError('categoryId')"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ fieldError('categoryId') }}
        </p>
      </div>

      <div>
        <label
          for="service-form-description"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.services.form.descriptionLabel') }}</label>
        <textarea
          id="service-form-description"
          v-model="form.description"
          rows="3"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <p
          v-if="fieldError('description')"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ fieldError('description') }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label
            for="service-form-duration"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.services.form.durationLabel') }}</label>
          <UiInput
            id="service-form-duration"
            v-model="form.durationLabel"
            :placeholder="t('dashboard.services.form.durationPlaceholder')"
          />
          <p
            v-if="fieldError('durationLabel')"
            class="mt-1.5 text-xs text-red-600 dark:text-red-400"
          >
            {{ fieldError('durationLabel') }}
          </p>
        </div>
        <div>
          <label
            for="service-form-price"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.services.form.priceLabel') }}</label>
          <div class="flex gap-2">
            <UiInput
              id="service-form-price"
              v-model="form.priceAmount"
              inputmode="decimal"
              :placeholder="t('dashboard.services.form.pricePlaceholder')"
            />
            <UiSelectSearch
              class="w-32 shrink-0"
              :model-value="form.priceType"
              :options="PRICE_TYPE_OPTIONS"
              @update:model-value="form.priceType = $event === 'flat' ? 'flat' : 'hourly'"
            />
          </div>
          <p
            v-if="fieldError('priceAmount') || fieldError('priceType')"
            class="mt-1.5 text-xs text-red-600 dark:text-red-400"
          >
            {{ fieldError('priceAmount') || fieldError('priceType') }}
          </p>
        </div>
      </div>

      <p
        v-if="fieldError('form')"
        role="alert"
        class="text-sm font-semibold text-red-600 dark:text-red-400"
      >
        {{ fieldError('form') }}
      </p>

      <div class="mt-2 flex justify-end gap-2.5">
        <UiButton
          type="button"
          variant="ghost"
          @click="emit('close')"
        >
          {{ t('dashboard.services.form.cancel') }}
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          :disabled="!isValid || submitting"
        >
          {{ service ? t('dashboard.services.form.save') : t('dashboard.services.form.create') }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
