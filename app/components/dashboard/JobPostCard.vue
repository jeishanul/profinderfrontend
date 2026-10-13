<script setup lang="ts">
import type { JobPost } from '#shared/types/jobPosts'

// Auto-imported as <DashboardJobPostCard/>. One of the consumer's posts on the "My posts" list.
defineProps<{
  post: JobPost
}>()

const { t } = useI18n()
const { budgetLabel, timeLabel, dateLabel, placeLabel, relativeLabel } = useJobLabels()
</script>

<template>
  <NuxtLinkLocale
    :to="`/seek-job/${post.id}`"
    class="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/70 p-5 transition-colors hover:border-brand-500 dark:border-white/10 dark:bg-black/30 dark:hover:border-brand-500"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h2 class="truncate font-display text-lg font-bold">
          {{ post.title }}
        </h2>
        <p class="mt-0.5 text-xs text-black/50 dark:text-white/50">
          {{ post.categoryName }}<template v-if="post.categoryName">
            ·
          </template>{{ t('seekJob.card.posted', { when: relativeLabel(post.createdAt) }) }}
        </p>
      </div>
      <DashboardJobPostStatusBadge :status="post.status" />
    </div>

    <p
      v-if="post.status === 'closed' && post.closedReason"
      class="text-xs font-semibold text-black/50 dark:text-white/50"
    >
      {{ t(`seekJob.closedReason.${post.closedReason}`) }}
    </p>

    <p class="line-clamp-2 text-sm text-black/70 dark:text-white/70">
      {{ post.description }}
    </p>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-black/60 dark:text-white/60">
      <span class="inline-flex items-center gap-1.5">
        <UiIcon
          name="map-pin"
          :size="13"
        />{{ placeLabel(post) || t('seekJob.card.noLocation') }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <UiIcon
          name="calendar"
          :size="13"
        />{{ post.preferredDate ? dateLabel(post.preferredDate) : t('seekJob.card.anyDate') }} · {{ timeLabel(post.preferredTime) }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <UiIcon
          name="wallet"
          :size="13"
        />{{ budgetLabel(post.budget) }}
      </span>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/5">
      <span class="text-sm font-semibold">
        {{ t('seekJob.card.applicants', { count: post.applicationsCount }, post.applicationsCount) }}
      </span>
      <UiTag
        v-if="post.newApplicationsCount > 0"
        variant="accent"
        size="sm"
      >
        {{ t('seekJob.card.newApplicants', { count: post.newApplicationsCount }) }}
      </UiTag>
    </div>
  </NuxtLinkLocale>
</template>
