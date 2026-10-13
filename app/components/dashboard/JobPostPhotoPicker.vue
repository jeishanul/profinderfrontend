<script setup lang="ts">
import type { JobPostPhoto } from '#shared/types/jobPosts'

// Auto-imported as <DashboardJobPostPhotoPicker/>. The photos of a job post: the ones it already has (edit mode) and
// the new ones waiting to be uploaded. Checks each file in the browser against the server's limits first.
const props = defineProps<{
  /** Photos the post already has. */
  existing?: JobPostPhoto[]
}>()

const emit = defineEmits<{
  'remove-existing': [photoId: string]
}>()

const files = defineModel<File[]>({ required: true })

const { t } = useI18n()
const toast = useToast()
const inputRef = useTemplateRef('inputRef')

const total = computed(() => (props.existing?.length ?? 0) + files.value.length)

// Object URLs are created once per file and released with it, not on every render.
const previews = computed(() => files.value.map(file => ({ file, url: import.meta.client ? URL.createObjectURL(file) : '' })))
watch(previews, (_next, previous) => previous?.forEach(entry => entry.url && URL.revokeObjectURL(entry.url)))
onBeforeUnmount(() => previews.value.forEach(entry => entry.url && URL.revokeObjectURL(entry.url)))

function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const accepted: File[] = []

  for (const file of Array.from(input.files ?? [])) {
    const problem = photoProblem(file, total.value + accepted.length)
    if (problem) {
      toast.error(t(`seekJob.photoErrors.${problem}`, { max: JOB_PHOTOS_MAX }))
      continue
    }
    accepted.push(file)
  }

  files.value = [...files.value, ...accepted]
  // Picking the same file again later must still fire `change`.
  input.value = ''
}

function removeNew(index: number) {
  files.value = files.value.filter((_, i) => i !== index)
}
</script>

<template>
  <div>
    <ul
      v-if="total > 0"
      class="mb-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5"
    >
      <li
        v-for="photo in existing ?? []"
        :key="photo.id"
        class="group relative aspect-square overflow-hidden rounded-xl bg-black/5 dark:bg-white/10"
      >
        <img
          v-if="photo.available"
          :src="photo.url"
          :alt="t('seekJob.form.fields.photos.existing')"
          loading="lazy"
          class="h-full w-full object-cover"
        >
        <span
          v-else
          class="flex h-full items-center justify-center p-2 text-center text-[11px] text-black/50 dark:text-white/50"
        >{{ t('seekJob.form.fields.photos.unavailable') }}</span>
        <button
          type="button"
          class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
          :aria-label="t('seekJob.form.fields.photos.remove')"
          @click="emit('remove-existing', photo.id)"
        >
          <UiIcon
            name="x"
            :size="12"
          />
        </button>
      </li>
      <li
        v-for="(preview, index) in previews"
        :key="`${preview.file.name}-${index}`"
        class="relative aspect-square overflow-hidden rounded-xl bg-black/5 dark:bg-white/10"
      >
        <img
          :src="preview.url"
          :alt="preview.file.name"
          class="h-full w-full object-cover"
        >
        <button
          type="button"
          class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
          :aria-label="t('seekJob.form.fields.photos.remove')"
          @click="removeNew(index)"
        >
          <UiIcon
            name="x"
            :size="12"
          />
        </button>
      </li>
    </ul>

    <input
      ref="inputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      :aria-label="t('seekJob.form.fields.photos.add')"
      multiple
      class="sr-only"
      tabindex="-1"
      @change="pick"
    >
    <UiButton
      type="button"
      variant="secondary"
      size="sm"
      :disabled="total >= JOB_PHOTOS_MAX"
      @click="inputRef?.click()"
    >
      <UiIcon
        name="image"
        :size="14"
      />{{ t('seekJob.form.fields.photos.add') }}
    </UiButton>
  </div>
</template>
