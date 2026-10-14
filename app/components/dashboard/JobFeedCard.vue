<script setup lang="ts">
import type { JobPostForProvider } from '#shared/types/jobPosts'

// Auto-imported as <DashboardJobFeedCard/>. One open job in a provider's feed. The street address is never part of what
// a provider sees, only the area.
defineProps<{
  post: JobPostForProvider
}>()

const { t } = useI18n()
const { budgetLabel, timeLabel, dateLabel, placeLabel, relativeLabel } = useJobLabels()
</script>

<template>
  <NuxtLinkLocale
    :to="`/find-jobs/${post.id}`"
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
          </template>{{ t('findJobs.card.posted', { when: relativeLabel(post.createdAt) }) }}
          <template v-if="post.postedBy.name">
            · {{ t('findJobs.card.by', { name: post.postedBy.name }) }}
          </template>
        </p>
      </div>
      <UiTag
        v-if="post.applied"
        variant="primary"
        size="sm"
      >
        <UiIcon
          name="check"
          :size="11"
        />{{ t('findJobs.card.applied') }}
      </UiTag>
    </div>

    <p class="line-clamp-2 text-sm text-black/70 dark:text-white/70">
      {{ post.description }}
    </p>

    <ul
      v-if="post.tasks.length > 0"
      class="flex flex-wrap gap-1.5"
    >
      <li
        v-for="task in post.tasks.slice(0, 3)"
        :key="task"
      >
        <UiTag size="sm">
          {{ task }}
        </UiTag>
      </li>
      <li v-if="post.tasks.length > 3">
        <UiTag size="sm">
          +{{ post.tasks.length - 3 }}
        </UiTag>
      </li>
    </ul>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-black/60 dark:text-white/60">
      <span class="inline-flex items-center gap-1.5">
        <UiIcon
          name="map-pin"
          :size="13"
        />{{ placeLabel(post) }}
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

    <div class="flex items-center justify-between gap-2 border-t border-black/5 pt-3 text-sm dark:border-white/5">
      <span class="font-semibold">{{ t('findJobs.card.applicants', { count: post.applicationsCount }, post.applicationsCount) }}</span>
      <span class="text-xs font-semibold text-brand-700 dark:text-brand-100">{{ post.applied ? t('findJobs.card.viewApplication') : t('findJobs.card.apply') }} →</span>
    </div>
  </NuxtLinkLocale>
</template>
