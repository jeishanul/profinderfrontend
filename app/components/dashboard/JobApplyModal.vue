<script setup lang="ts">
import type { JobApplicationMine, JobOfferPayload, JobPostForProvider } from '#shared/types/jobPosts'

// Auto-imported as <DashboardJobApplyModal/>. A provider's application to a job post: a note and a price offer
// (price, hours, when, extra-hour rate). Also changes a pending application's offer (`application` prop). If the client
// hires them, the offer becomes the booking, so the date is required and must still be ahead.
const props = defineProps<{
  open: boolean
  post: JobPostForProvider
  /** Editing this pending application instead of making a new one. */
  application?: JobApplicationMine | null
  submitting?: boolean
  /** Server-side field errors, keyed by the API field name. */
  errors?: Record<string, string>
}>()

const emit = defineEmits<{
  close: []
  submit: [JobOfferPayload]
}>()

const { t } = useI18n()
const { money } = useSiteSettings()
const { budgetLabel, dateLabel, timeLabel } = useJobLabels()
const titleId = useId()

const price = ref(0)
const hours = ref(0)
const extraRate = ref(0)
const when = ref('')
const note = ref('')
const localError = ref('')

function resetForm() {
  localError.value = ''
  if (props.application) {
    price.value = props.application.offerPrice
    hours.value = props.application.offerHours
    extraRate.value = props.application.extraHourlyRate ?? 0
    when.value = toDateTimeLocalValue(props.application.proposedAt)
    note.value = props.application.note
    return
  }
  price.value = 0
  hours.value = 0
  extraRate.value = 0
  note.value = ''
  // Start from the day (and time of day) the client asked for, so the provider only has to add a price.
  when.value = suggestedStart(props.post.preferredDate, props.post.preferredTime)
}

watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
}, { immediate: true })

function submit() {
  localError.value = ''
  if (!note.value.trim()) {
    localError.value = t('findJobs.apply.errors.note')
    return
  }
  const proposedAt = fromDateTimeLocalValue(when.value)
  const problem = offerProblem({ price: price.value, hours: hours.value, scheduledAt: proposedAt })
  if (problem) {
    localError.value = problem === 'price'
      ? t('dashboard.messages.quote.errors.price', { amount: money(0) })
      : t(`dashboard.messages.quote.errors.${problem}`)
    return
  }

  emit('submit', {
    note: note.value.trim(),
    offerPrice: price.value,
    offerHours: hours.value,
    extraHourlyRate: extraRate.value > 0 ? extraRate.value : null,
    proposedAt: proposedAt!,
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
      {{ application ? t('findJobs.apply.titleEdit') : t('findJobs.apply.title', { title: post.title }) }}
    </h2>
    <p class="mb-4 text-sm text-black/60 dark:text-white/60">
      {{ t('findJobs.apply.subtitle') }}
    </p>

    <div class="mb-4 rounded-xl bg-black/[0.03] px-4 py-3 text-xs text-black/70 dark:bg-white/[0.06] dark:text-white/70">
      <p class="font-bold">
        {{ t('findJobs.apply.jobSummary') }}
      </p>
      <p class="mt-1">
        {{ t('findJobs.apply.tasks', { count: post.tasks.length }) }} · {{ post.preferredDate ? dateLabel(post.preferredDate) : t('seekJob.card.anyDate') }} · {{ timeLabel(post.preferredTime) }} · {{ budgetLabel(post.budget) }}
      </p>
    </div>

    <form
      class="flex max-h-[62vh] flex-col gap-4 overflow-y-auto pr-1"
      @submit.prevent="submit"
    >
      <div>
        <label
          for="apply-note"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('findJobs.apply.noteLabel') }}</label>
        <textarea
          id="apply-note"
          v-model="note"
          rows="4"
          maxlength="1000"
          :placeholder="t('findJobs.apply.notePlaceholder')"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <DashboardOfferFields
        v-model:price="price"
        v-model:hours="hours"
        v-model:extra-rate="extraRate"
        v-model:when="when"
        id-prefix="apply"
      />

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
          {{ t('findJobs.apply.cancel') }}
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          :disabled="submitting"
        >
          {{ application ? t('findJobs.apply.save') : t('findJobs.apply.submit') }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
