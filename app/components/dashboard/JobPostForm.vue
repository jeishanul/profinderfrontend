<script setup lang="ts">
import type { JobBudgetType, JobPostFormValues, JobPostPhoto, JobPreferredTime } from '#shared/types/jobPosts'

// Auto-imported as <DashboardJobPostForm/>. The create/edit form of a Seek Job post. It owns the checklist editor and
// the field-level checks; the page owns saving, so the same form serves both "Post a job" and "Edit your post".
const props = defineProps<{
  mode: 'create' | 'edit'
  /** Someone already applied, so the category and place are fixed. */
  locked?: boolean
  /** The place, written out, shown in place of the pickers while locked. */
  lockedPlace?: string
  existingPhotos?: JobPostPhoto[]
  /** Field errors from the server (or the page), keyed like the API's own `errors`. */
  errors?: Record<string, string>
  submitting?: boolean
}>()

const emit = defineEmits<{
  'submit': []
  'cancel': []
  'remove-existing-photo': [photoId: string]
}>()

const values = defineModel<JobPostFormValues>({ required: true })
const photos = defineModel<File[]>('photos', { default: () => [] })

const { t } = useI18n()
const { symbol } = useSiteSettings()
const { data: categories } = await useCategories()

const categoryOptions = computed(() => (categories.value ?? []).map(category => ({ value: category.id, label: category.name })))
const categoryName = computed(() => categoryOptions.value.find(option => option.value === values.value.categoryId)?.label ?? '')

const TIMES: JobPreferredTime[] = ['morning', 'afternoon', 'evening', 'flexible']
const BUDGETS: JobBudgetType[] = ['open', 'fixed', 'range']

// The earliest and latest preferred date the server accepts (today up to the longest a post may stay open).
const today = new Date()
const toDateInput = (date: Date) => toDateTimeLocalValue(date).slice(0, 10)
const minDate = toDateInput(today)
const maxDate = toDateInput(new Date(today.getTime() + 30 * 86_400_000))

// --- checklist -----------------------------------------------------------------------------------------------------
// Always at least one row to type in, so a new post doesn't start with an empty list and nothing to click.
if (values.value.tasks.length === 0) values.value.tasks = ['']

const taskCount = computed(() => normalizeTasks(values.value.tasks).length)

function setTask(index: number, value: string) {
  values.value.tasks = values.value.tasks.map((task, i) => (i === index ? value : task))
}
function addTask() {
  if (values.value.tasks.length < JOB_TASKS_MAX) values.value.tasks = [...values.value.tasks, '']
}
function removeTask(index: number) {
  const next = values.value.tasks.filter((_, i) => i !== index)
  values.value.tasks = next.length > 0 ? next : ['']
}
const moveTaskBy = (index: number, direction: -1 | 1) => (values.value.tasks = moveTask(values.value.tasks, index, direction))

// --- validation ----------------------------------------------------------------------------------------------------
const localErrors = ref<Record<string, string>>({})
const shown = computed(() => ({ ...localErrors.value, ...props.errors }))

function validate(): boolean {
  const v = values.value
  const errors: Record<string, string> = {}

  if (!v.title.trim()) errors.title = t('seekJob.form.errors.title')
  if (!v.description.trim()) errors.description = t('seekJob.form.errors.description')
  if (taskCount.value === 0) errors.tasks = t('seekJob.form.errors.tasks')
  if (!v.categoryId) errors.categoryId = t('seekJob.form.errors.category')
  if (!v.provinceCode || !v.cityCode) errors.cityCode = t('seekJob.form.errors.location')
  if (!v.address.trim()) errors.address = t('seekJob.form.errors.address')
  if (v.budgetType !== 'open' && !(Number(v.budgetMin) > 0)) errors.budgetMin = t('seekJob.form.errors.budgetMin')
  if (v.budgetType === 'range' && !(Number(v.budgetMax) >= Number(v.budgetMin))) errors.budgetMax = t('seekJob.form.errors.budgetMax')

  localErrors.value = errors
  return Object.keys(errors).length === 0
}

function submit() {
  if (validate()) emit('submit')
}

const inputClass = 'w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white'
const chipClass = (active: boolean) => [
  'rounded-full border px-4 py-2 text-xs font-bold transition-colors',
  active
    ? 'border-brand-600 bg-brand-600 text-white'
    : 'border-black/10 bg-white text-black/60 hover:text-black dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white',
]
</script>

<template>
  <form
    class="flex flex-col gap-6"
    novalidate
    @submit.prevent="submit"
  >
    <div>
      <label
        for="jp-title"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('seekJob.form.fields.title.label') }}</label>
      <UiInput
        id="jp-title"
        v-model="values.title"
        maxlength="120"
        :placeholder="t('seekJob.form.fields.title.placeholder')"
      />
      <p
        v-if="shown.title"
        class="mt-1.5 text-xs text-red-600 dark:text-red-400"
      >
        {{ shown.title }}
      </p>
    </div>

    <div>
      <label
        for="jp-description"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('seekJob.form.fields.description.label') }}</label>
      <textarea
        id="jp-description"
        v-model="values.description"
        rows="4"
        maxlength="2000"
        :placeholder="t('seekJob.form.fields.description.placeholder')"
        :class="inputClass"
      />
      <p
        v-if="shown.description"
        class="mt-1.5 text-xs text-red-600 dark:text-red-400"
      >
        {{ shown.description }}
      </p>
    </div>

    <fieldset>
      <legend class="mb-1 text-xs font-bold">
        {{ t('seekJob.form.fields.tasks.label') }}
        <span class="ml-1 font-normal text-black/40 dark:text-white/40">{{ t('seekJob.form.fields.tasks.count', { count: taskCount, max: JOB_TASKS_MAX }) }}</span>
      </legend>
      <p class="mb-2.5 text-xs text-black/50 dark:text-white/50">
        {{ t('seekJob.form.fields.tasks.hint') }}
      </p>
      <ul class="flex flex-col gap-2">
        <li
          v-for="(task, index) in values.tasks"
          :key="index"
          class="flex items-center gap-1.5"
        >
          <UiInput
            :model-value="task"
            :aria-label="t('seekJob.form.fields.tasks.label')"
            maxlength="120"
            class="flex-1"
            :placeholder="t('seekJob.form.fields.tasks.placeholder')"
            @update:model-value="setTask(index, $event)"
          />
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/40 hover:bg-black/5 disabled:opacity-30 dark:text-white/40 dark:hover:bg-white/10"
            :disabled="index === 0"
            :aria-label="t('seekJob.form.fields.tasks.moveUp')"
            @click="moveTaskBy(index, -1)"
          >
            <UiIcon
              name="chevron-left"
              :size="15"
              class="rotate-90"
            />
          </button>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/40 hover:bg-black/5 disabled:opacity-30 dark:text-white/40 dark:hover:bg-white/10"
            :disabled="index === values.tasks.length - 1"
            :aria-label="t('seekJob.form.fields.tasks.moveDown')"
            @click="moveTaskBy(index, 1)"
          >
            <UiIcon
              name="chevron-left"
              :size="15"
              class="-rotate-90"
            />
          </button>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/40 hover:bg-black/5 hover:text-red-600 dark:text-white/40 dark:hover:bg-white/10"
            :aria-label="t('seekJob.form.fields.tasks.remove')"
            @click="removeTask(index)"
          >
            <UiIcon
              name="trash"
              :size="15"
            />
          </button>
        </li>
      </ul>
      <UiButton
        type="button"
        variant="ghost"
        size="sm"
        class="mt-2"
        :disabled="values.tasks.length >= JOB_TASKS_MAX"
        @click="addTask"
      >
        <UiIcon
          name="plus"
          :size="14"
        />{{ t('seekJob.form.fields.tasks.add') }}
      </UiButton>
      <p
        v-if="shown.tasks"
        class="mt-1.5 text-xs text-red-600 dark:text-red-400"
      >
        {{ shown.tasks }}
      </p>
    </fieldset>

    <p
      v-if="locked"
      class="rounded-xl bg-accent-50 px-4 py-3 text-xs text-accent-700 dark:bg-accent-700/20 dark:text-accent-100"
    >
      {{ t('seekJob.form.lockedHint') }}
    </p>

    <div>
      <label
        for="jp-category"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('seekJob.form.fields.category.label') }}</label>
      <p
        v-if="locked"
        class="text-sm font-semibold"
      >
        {{ categoryName }}
      </p>
      <UiSelectSearch
        v-else
        id="jp-category"
        v-model="values.categoryId"
        :options="categoryOptions"
        :placeholder="t('seekJob.form.fields.category.placeholder')"
        :search-placeholder="t('seekJob.form.fields.category.search')"
      />
      <p
        v-if="shown.categoryId"
        class="mt-1.5 text-xs text-red-600 dark:text-red-400"
      >
        {{ shown.categoryId }}
      </p>
    </div>

    <div>
      <p class="mb-1.5 text-xs font-bold">
        {{ t('seekJob.form.fields.location.label') }}
      </p>
      <p
        v-if="locked"
        class="text-sm font-semibold"
      >
        {{ lockedPlace }}
      </p>
      <div
        v-else
        class="grid gap-4 sm:grid-cols-3"
      >
        <UiLocationPicker
          v-model:province="values.provinceCode"
          v-model:city="values.cityCode"
          v-model:barangay="values.barangay"
          variant="form"
        />
      </div>
      <p
        v-if="shown.cityCode || shown.provinceCode || shown.barangay"
        class="mt-1.5 text-xs text-red-600 dark:text-red-400"
      >
        {{ shown.cityCode ?? shown.provinceCode ?? shown.barangay }}
      </p>
    </div>

    <div>
      <label
        for="jp-address"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('seekJob.form.fields.address.label') }}</label>
      <UiInput
        id="jp-address"
        v-model="values.address"
        icon="map-pin"
        maxlength="255"
        :placeholder="t('seekJob.form.fields.address.placeholder')"
      />
      <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
        {{ t('seekJob.form.fields.address.hint') }}
      </p>
      <p
        v-if="shown.address"
        class="mt-1.5 text-xs text-red-600 dark:text-red-400"
      >
        {{ shown.address }}
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label
          for="jp-date"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('seekJob.form.fields.date.label') }}</label>
        <input
          id="jp-date"
          v-model="values.preferredDate"
          type="date"
          :min="minDate"
          :max="maxDate"
          :class="inputClass"
        >
        <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
          {{ t('seekJob.form.fields.date.hint') }}
        </p>
        <p
          v-if="shown.preferredDate"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ shown.preferredDate }}
        </p>
      </div>
      <fieldset>
        <legend class="mb-1.5 text-xs font-bold">
          {{ t('seekJob.form.fields.time.label') }}
        </legend>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="time in TIMES"
            :key="time"
            type="button"
            :class="chipClass(values.preferredTime === time)"
            :aria-pressed="values.preferredTime === time"
            @click="values.preferredTime = time"
          >
            {{ t(`seekJob.time.${time}`) }}
          </button>
        </div>
      </fieldset>
    </div>

    <fieldset>
      <legend class="mb-1.5 text-xs font-bold">
        {{ t('seekJob.form.fields.budget.label') }}
      </legend>
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          v-for="type in BUDGETS"
          :key="type"
          type="button"
          :class="chipClass(values.budgetType === type)"
          :aria-pressed="values.budgetType === type"
          @click="values.budgetType = type"
        >
          {{ t(`seekJob.form.fields.budget.types.${type}`) }}
        </button>
      </div>
      <div
        v-if="values.budgetType !== 'open'"
        class="grid max-w-md grid-cols-2 gap-3"
      >
        <div>
          <label
            for="jp-budget-min"
            class="mb-1.5 block text-xs font-semibold text-black/60 dark:text-white/60"
          >{{ values.budgetType === 'range' ? t('seekJob.form.fields.budget.minRange') : t('seekJob.form.fields.budget.min') }} ({{ symbol }})</label>
          <input
            id="jp-budget-min"
            v-model="values.budgetMin"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            :class="inputClass"
          >
          <p
            v-if="shown.budgetMin"
            class="mt-1.5 text-xs text-red-600 dark:text-red-400"
          >
            {{ shown.budgetMin }}
          </p>
        </div>
        <div v-if="values.budgetType === 'range'">
          <label
            for="jp-budget-max"
            class="mb-1.5 block text-xs font-semibold text-black/60 dark:text-white/60"
          >{{ t('seekJob.form.fields.budget.max') }} ({{ symbol }})</label>
          <input
            id="jp-budget-max"
            v-model="values.budgetMax"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            :class="inputClass"
          >
          <p
            v-if="shown.budgetMax"
            class="mt-1.5 text-xs text-red-600 dark:text-red-400"
          >
            {{ shown.budgetMax }}
          </p>
        </div>
      </div>
    </fieldset>

    <div>
      <p class="mb-1 text-xs font-bold">
        {{ t('seekJob.form.fields.photos.label') }}
      </p>
      <p class="mb-2.5 text-xs text-black/50 dark:text-white/50">
        {{ t('seekJob.form.fields.photos.hint', { max: JOB_PHOTOS_MAX }) }}
      </p>
      <DashboardJobPostPhotoPicker
        v-model="photos"
        :existing="existingPhotos"
        @remove-existing="emit('remove-existing-photo', $event)"
      />
      <p
        v-if="shown.photos"
        class="mt-1.5 text-xs text-red-600 dark:text-red-400"
      >
        {{ shown.photos }}
      </p>
    </div>

    <p
      v-if="shown.form"
      role="alert"
      class="text-sm font-semibold text-red-600 dark:text-red-400"
    >
      {{ shown.form }}
    </p>
    <slot name="extra" />

    <div class="flex justify-end gap-2.5">
      <UiButton
        type="button"
        variant="ghost"
        @click="emit('cancel')"
      >
        {{ t('seekJob.form.cancel') }}
      </UiButton>
      <UiButton
        type="submit"
        variant="primary"
        :disabled="submitting"
      >
        {{ mode === 'create' ? t('seekJob.form.submitNew') : t('seekJob.form.submitEdit') }}
      </UiButton>
    </div>
  </form>
</template>
