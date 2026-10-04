<script setup lang="ts">
import type { ReviewFormTarget } from '~/composables/useReviewForm'

// Auto-imported as <DashboardReviewFormModal/>. Rate (1-5) and optionally
// comment on a finished job — or revise/delete your own review. Mounted once
// in the dashboard layout and driven by `useReviewForm()`.
const props = defineProps<{
  target: ReviewFormTarget
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const toast = useToast()
const { confirm } = useConfirm()
const titleId = useId()

const isEditing = computed(() => Boolean(props.target.review))
const rating = ref(props.target.review?.rating ?? 0)
const comment = ref(props.target.review?.comment ?? '')
const errors = ref<Record<string, string>>({})
const isSaving = ref(false)

const MIN_COMMENT = 10

/** Everything a review can change: the booking behind it, the lists, the provider's public rating. */
const refreshBookingLists = useRefreshBookingLists()
async function refreshAfterChange() {
  await refreshBookingLists([`booking-${props.target.bookingId}`])
}

async function submit() {
  errors.value = {}
  if (rating.value < 1) {
    errors.value = { rating: t('dashboard.reviewForm.errors.rating') }
    return
  }
  const trimmed = comment.value.trim()
  if (trimmed && trimmed.length < MIN_COMMENT) {
    errors.value = { comment: t('dashboard.reviewForm.errors.commentShort', { count: MIN_COMMENT }) }
    return
  }

  isSaving.value = true
  try {
    const body = { rating: rating.value, comment: trimmed || null }
    if (props.target.review) {
      await useApiFetch(`/api/dashboard/reviews/${props.target.review.id}`, { method: 'PATCH', body })
    }
    else {
      await useApiFetch(`/api/dashboard/bookings/${props.target.bookingId}/review`, { method: 'POST', body })
    }
    await refreshAfterChange()
    toast.success(t(isEditing.value ? 'dashboard.reviewForm.updated' : 'dashboard.reviewForm.thanks'))
    emit('close')
  }
  catch (error) {
    errors.value = apiFieldErrors(error)
    if (Object.keys(errors.value).length === 0) errors.value = { form: apiErrorMessage(error, t('dashboard.reviewForm.errors.save')) }
  }
  finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!props.target.review) return
  const confirmed = await confirm({
    title: t('dashboard.reviewForm.deleteConfirm.title'),
    message: t('dashboard.reviewForm.deleteConfirm.message'),
    confirmLabel: t('dashboard.reviewForm.delete'),
    tone: 'danger',
  })
  if (!confirmed) return

  isSaving.value = true
  try {
    await useApiFetch(`/api/dashboard/reviews/${props.target.review.id}`, { method: 'DELETE' })
    await refreshAfterChange()
    toast.success(t('dashboard.reviewForm.deleted'))
    emit('close')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.reviewForm.errors.save')))
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UiModal
    :open="true"
    :labelledby="titleId"
    @close="emit('close')"
  >
    <h2
      :id="titleId"
      class="mb-1.5 font-display text-xl font-bold"
    >
      {{ t(isEditing ? 'dashboard.reviewForm.editTitle' : 'dashboard.reviewForm.title', { name: target.providerName }) }}
    </h2>
    <p class="mb-5 text-sm text-black/60 dark:text-white/60">
      {{ t('dashboard.reviewForm.subtitle') }}
    </p>

    <form
      class="flex flex-col gap-4"
      @submit.prevent="submit"
    >
      <div>
        <UiStarInput
          v-model="rating"
          :label="t('dashboard.reviewForm.ratingLabel')"
          :disabled="isSaving"
        />
        <p
          v-if="errors.rating"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ errors.rating }}
        </p>
      </div>

      <div>
        <label
          for="review-comment"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.reviewForm.commentLabel') }}</label>
        <textarea
          id="review-comment"
          v-model="comment"
          rows="4"
          maxlength="2000"
          :placeholder="t('dashboard.reviewForm.commentPlaceholder')"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <p
          v-if="errors.comment"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ errors.comment }}
        </p>
      </div>

      <p
        v-if="errors.form || errors.booking"
        role="alert"
        class="text-sm font-semibold text-red-600 dark:text-red-400"
      >
        {{ errors.form || errors.booking }}
      </p>

      <div class="flex items-center justify-between gap-2.5">
        <UiButton
          v-if="isEditing"
          type="button"
          variant="ghost"
          class="text-red-600! dark:text-red-400!"
          :disabled="isSaving"
          @click="remove"
        >
          {{ t('dashboard.reviewForm.delete') }}
        </UiButton>
        <span v-else />
        <div class="flex gap-2.5">
          <UiButton
            type="button"
            variant="ghost"
            @click="emit('close')"
          >
            {{ t('dashboard.reviewForm.cancel') }}
          </UiButton>
          <UiButton
            type="submit"
            variant="primary"
            :disabled="isSaving"
          >
            {{ t(isEditing ? 'dashboard.reviewForm.saveChanges' : 'dashboard.reviewForm.submit') }}
          </UiButton>
        </div>
      </div>
    </form>
  </UiModal>
</template>
