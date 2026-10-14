<script setup lang="ts">
import type { JobPostStatus } from '#shared/types/jobPosts'

// Auto-imported as <DashboardJobPostStatusBadge/>. The colour and label of a job post's status, in one place.
const props = defineProps<{
  status: JobPostStatus
}>()

const { t } = useI18n()

const VARIANT: Record<JobPostStatus, 'primary' | 'neutral' | 'accent' | 'danger'> = {
  open: 'primary',
  hired: 'accent',
  completed: 'neutral',
  closed: 'neutral',
  removed: 'danger',
}
</script>

<template>
  <UiTag :variant="VARIANT[props.status]">
    {{ t(`seekJob.status.${props.status}`) }}
  </UiTag>
</template>
