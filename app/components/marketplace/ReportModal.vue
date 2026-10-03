<script setup lang="ts">
// Auto-imported as <MarketplaceReportModal/>. "Report" for a provider, a review
// or a message: pick a reason, add optional detail, and it lands in the
// admins' moderation queue. Requires an account (the caller opens the login
// modal first when logged out).
const props = defineProps<{
  open: boolean
  type: 'provider' | 'review' | 'message'
  targetId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const toast = useToast()
const titleId = useId()

const REASONS = ['spam', 'fraud', 'offensive', 'fake', 'other'] as const
const reason = ref<(typeof REASONS)[number] | null>(null)
const details = ref('')
const error = ref('')
const isSending = ref(false)

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  reason.value = null
  details.value = ''
  error.value = ''
})

async function submit() {
  if (!reason.value) {
    error.value = t('marketplace.report.errors.reason')
    return
  }
  isSending.value = true
  error.value = ''
  try {
    await useApiFetch('/api/reports', {
      method: 'POST',
      body: { type: props.type, id: Number(props.targetId), reason: reason.value, details: details.value.trim() || null },
    })
    toast.success(t('marketplace.report.sent'))
    emit('close')
  }
  catch (e) {
    error.value = Object.values(apiFieldErrors(e))[0] ?? apiErrorMessage(e, t('marketplace.report.errors.send'))
  }
  finally {
    isSending.value = false
  }
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
      class="mb-1.5 font-display text-xl font-bold"
    >
      {{ t(`marketplace.report.title.${type}`) }}
    </h2>
    <p class="mb-4 text-sm text-black/60 dark:text-white/60">
      {{ t('marketplace.report.subtitle') }}
    </p>

    <form
      class="flex flex-col gap-4"
      @submit.prevent="submit"
    >
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1 text-xs font-bold">
          {{ t('marketplace.report.reasonLabel') }}
        </legend>
        <label
          v-for="option in REASONS"
          :key="option"
          :for="`report-reason-${option}`"
          class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 dark:border-white/10 dark:has-[:checked]:bg-brand-700/20"
        >
          <input
            :id="`report-reason-${option}`"
            v-model="reason"
            type="radio"
            name="report-reason"
            :value="option"
            class="accent-brand-600"
          >
          {{ t(`marketplace.report.reasons.${option}`) }}
        </label>
      </fieldset>

      <div>
        <label
          for="report-details"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('marketplace.report.detailsLabel') }}</label>
        <textarea
          id="report-details"
          v-model="details"
          rows="3"
          maxlength="1000"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <p
        v-if="error"
        role="alert"
        class="text-sm font-semibold text-red-600 dark:text-red-400"
      >
        {{ error }}
      </p>

      <div class="flex justify-end gap-2.5">
        <UiButton
          type="button"
          variant="ghost"
          @click="emit('close')"
        >
          {{ t('marketplace.report.cancel') }}
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          :disabled="isSending"
        >
          {{ t('marketplace.report.submit') }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
