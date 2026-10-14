<script setup lang="ts">
import type { JobPost, JobPostFormValues } from '#shared/types/jobPosts'

// Edit an open post. The text, date and budget can always change; once providers have applied the category and place
// are fixed (the server enforces it too). New photos upload after the save; removing a current one happens straight away.
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const toast = useToast()
const { confirm } = useConfirm()
const jobError = useJobErrors()
const { placeLabel } = useJobLabels()

const id = String(route.params.id)
const { data: post, error } = await useApi<JobPost>(`/dashboard/job-posts/${id}`, { key: `seek-job-${id}` })

if (error.value || !post.value) {
  throw createError({ statusCode: apiErrorStatus(error.value) ?? 404, statusMessage: t('errors.notFound'), fatal: true })
}
// Only an open post can be edited; anything else goes back to its page.
if (!post.value.can.edit) await navigateTo(localePath(`/seek-job/${id}`), { replace: true })

const values = ref<JobPostFormValues>({
  title: post.value.title,
  description: post.value.description,
  tasks: [...post.value.tasks],
  categoryId: post.value.categoryId,
  provinceCode: post.value.provinceCode,
  cityCode: post.value.cityCode,
  barangay: post.value.barangay,
  address: post.value.address ?? '',
  preferredDate: post.value.preferredDate ?? '',
  preferredTime: post.value.preferredTime,
  budgetType: post.value.budget.type,
  budgetMin: post.value.budget.min !== null ? String(post.value.budget.min) : '',
  budgetMax: post.value.budget.max !== null ? String(post.value.budget.max) : '',
})
const photos = ref<File[]>([])
const existingPhotos = ref([...post.value.photos])
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

async function removePhoto(photoId: string) {
  if (!(await confirm({ title: t('seekJob.form.fields.photos.remove'), tone: 'danger' }))) return
  try {
    const updated = await useApiFetch<JobPost>(`/api/dashboard/job-posts/${id}/photos/${photoId}`, { method: 'DELETE' })
    existingPhotos.value = updated.photos
  }
  catch (e) {
    toast.error(jobError(e))
  }
}

async function submit() {
  errors.value = {}
  submitting.value = true
  try {
    await useApiFetch(`/api/dashboard/job-posts/${id}`, { method: 'PATCH', body: buildJobPostPayload(values.value) })

    // The post is saved; a failed photo upload must not make it look as if it weren't.
    if (photos.value.length > 0) {
      const body = new FormData()
      photos.value.forEach(file => body.append('photos[]', file))
      try {
        await useApiFetch(`/api/dashboard/job-posts/${id}/photos`, { method: 'POST', body })
      }
      catch (e) {
        toast.error(jobError(e, 'seekJob.form.errors.photos'))
      }
    }

    await Promise.all([refreshNuxtData(`seek-job-${id}`), refreshNuxtData('seek-job-posts')])
    toast.success(t('seekJob.form.saved'))
    await navigateTo(localePath(`/seek-job/${id}`))
  }
  catch (e) {
    const fields = groupFieldErrors(apiFieldErrors(e))
    errors.value = Object.keys(fields).length > 0 ? fields : { form: jobError(e, 'seekJob.form.errors.submit') }
    if (['post_fields_locked', 'post_not_open'].includes(apiErrorCode(e) ?? '')) errors.value.form = jobError(e)
  }
  finally {
    submitting.value = false
  }
}

useSeoMeta({ title: t('seekJob.form.titleEdit') })
</script>

<template>
  <div
    v-if="post"
    class="flex max-w-3xl flex-col gap-6"
  >
    <UiBackButton :fallback="`/seek-job/${id}`" />

    <div>
      <h1 class="font-display text-2xl font-bold">
        {{ t('seekJob.form.titleEdit') }}
      </h1>
      <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
        {{ t('seekJob.form.subtitleEdit') }}
      </p>
    </div>

    <DashboardJobPostForm
      v-model="values"
      v-model:photos="photos"
      mode="edit"
      :locked="post.locked"
      :locked-place="placeLabel(post)"
      :existing-photos="existingPhotos"
      :errors="errors"
      :submitting="submitting"
      @submit="submit"
      @cancel="navigateTo(localePath(`/seek-job/${id}`))"
      @remove-existing-photo="removePhoto"
    />
  </div>
</template>
