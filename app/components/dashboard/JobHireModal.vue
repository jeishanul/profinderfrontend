<script setup lang="ts">
import type { JobApplicant, JobPost } from '#shared/types/jobPosts'

// Auto-imported as <DashboardJobHireModal/>. The last look before hiring: what is being agreed and what happens to the
// post and the other applicants. Hiring books the provider, so it asks.
defineProps<{
  open: boolean
  applicant: JobApplicant | null
  post: JobPost
  submitting?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const titleId = useId()
</script>

<template>
  <UiModal
    :open="open && applicant !== null"
    :labelledby="titleId"
    @close="emit('close')"
  >
    <template v-if="applicant">
      <h2
        :id="titleId"
        class="mb-1.5 font-display text-xl font-bold"
      >
        {{ t('seekJob.hire.title', { name: applicant.provider.name }) }}
      </h2>
      <p class="mb-5 text-sm text-black/60 dark:text-white/60">
        {{ t('seekJob.hire.body', { name: applicant.provider.name }) }}
      </p>

      <dl class="mb-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 rounded-xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.06]">
        <dt class="text-black/50 dark:text-white/50">
          {{ t('seekJob.hire.summary.price') }}
        </dt>
        <dd class="font-semibold">
          {{ money(applicant.offerPrice) }}
        </dd>
        <dt class="text-black/50 dark:text-white/50">
          {{ t('seekJob.hire.summary.hours') }}
        </dt>
        <dd class="font-semibold">
          {{ applicant.offerHours }}
        </dd>
        <dt class="text-black/50 dark:text-white/50">
          {{ t('seekJob.hire.summary.date') }}
        </dt>
        <dd class="font-semibold">
          {{ formatDateTime(applicant.proposedAt, locale) }}
        </dd>
        <dt class="text-black/50 dark:text-white/50">
          {{ t('seekJob.hire.summary.address') }}
        </dt>
        <dd class="font-semibold">
          {{ post.address }}
        </dd>
      </dl>

      <p class="mb-5 text-xs text-black/60 dark:text-white/60">
        {{ t('seekJob.hire.consequence') }}
      </p>

      <p
        v-if="error"
        role="alert"
        class="mb-4 text-sm font-semibold text-red-600 dark:text-red-400"
      >
        {{ error }}
      </p>

      <div class="flex justify-end gap-2.5">
        <UiButton
          variant="ghost"
          @click="emit('close')"
        >
          {{ t('seekJob.hire.cancel') }}
        </UiButton>
        <UiButton
          variant="primary"
          :disabled="submitting"
          @click="emit('confirm')"
        >
          {{ t('seekJob.hire.confirm', { name: applicant.provider.name }) }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
