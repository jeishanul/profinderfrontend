<script setup lang="ts">
import type { JobPost, JobPostFormValues } from '#shared/types/jobPosts'

// Post a job. Creating sends multipart (photos can come along); the server then tells matching providers.
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const verification = useEmailVerification()
const jobError = useJobErrors()

const values = ref<JobPostFormValues>({
  title: '',
  description: '',
  tasks: [''],
  categoryId: null,
  provinceCode: null,
  cityCode: null,
  barangay: null,
  address: '',
  preferredDate: '',
  preferredTime: 'flexible',
  budgetType: 'open',
  budgetMin: '',
  budgetMax: '',
})
const photos = ref<File[]>([])
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
// The server refused because the email isn't verified: offer to fix that right here and carry on.
const needsEmailVerification = ref(false)

async function submit() {
  errors.value = {}
  needsEmailVerification.value = false
  submitting.value = true
  try {
    const post = await useApiFetch<JobPost>('/api/dashboard/job-posts', { method: 'POST', body: buildJobPostFormData(values.value, photos.value) })
    await refreshNuxtData('seek-job-posts')
    toast.success(t('seekJob.form.created'))
    await navigateTo(localePath(`/seek-job/${post.id}`))
  }
  catch (error) {
    if (isEmailUnverifiedError(error)) needsEmailVerification.value = true
    const fields = groupFieldErrors(apiFieldErrors(error))
    // Photo errors come back as `photos.0`; anything with no input on screen must still be said somewhere.
    errors.value = Object.keys(fields).length > 0 ? fields : { form: jobError(error, 'seekJob.form.errors.submit') }
    // "Verify your email" and "too many open posts" are not about any one field; say them above the buttons.
    if (needsEmailVerification.value || apiErrorCode(error) === 'too_many_open_posts') errors.value.form = jobError(error)
  }
  finally {
    submitting.value = false
  }
}

useSeoMeta({ title: t('seekJob.form.titleNew') })
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-6">
    <UiBackButton fallback="/seek-job" />

    <div>
      <h1 class="font-display text-2xl font-bold">
        {{ t('seekJob.form.titleNew') }}
      </h1>
      <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
        {{ t('seekJob.form.subtitleNew') }}
      </p>
    </div>

    <DashboardJobPostForm
      v-model="values"
      v-model:photos="photos"
      mode="create"
      :errors="errors"
      :submitting="submitting"
      @submit="submit"
      @cancel="navigateTo(localePath('/seek-job'))"
    >
      <template #extra>
        <UiButton
          v-if="needsEmailVerification"
          type="button"
          variant="secondary"
          :disabled="verification.isStarting.value"
          @click="verification.start(() => submit())"
        >
          {{ t('marketplace.jobRequest.verifyEmail') }}
        </UiButton>
      </template>
    </DashboardJobPostForm>
  </div>
</template>
