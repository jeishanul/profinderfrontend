<script setup lang="ts">
import type { JobPostBase } from '#shared/types/jobPosts'

// Auto-imported as <MarketplaceJobCard />.
defineProps<{
  post: JobPostBase
}>()

const { t } = useI18n()
const { budgetLabel, dateLabel, placeLabel, relativeLabel } = useJobLabels()
</script>

<template>
  <article class="relative flex flex-col justify-between gap-4 rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl transition hover:border-brand-500/50 hover:shadow-md dark:border-white/10 dark:bg-black/30 dark:hover:border-brand-500/50">
    <div class="space-y-3">
      <div class="flex items-start justify-between gap-2">
        <span
          v-if="post.categoryName"
          class="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
        >
          {{ post.categoryName }}
        </span>
        <span class="text-xs text-black/40 dark:text-white/40">
          {{ relativeLabel(post.createdAt) }}
        </span>
      </div>

      <NuxtLinkLocale
        :to="`/jobs/${post.id}`"
        class="block group"
      >
        <h3 class="font-display text-lg font-bold text-gray-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 line-clamp-1">
          {{ post.title }}
        </h3>
        <p class="mt-1 text-sm text-black/60 dark:text-white/60 line-clamp-2">
          {{ post.description }}
        </p>
      </NuxtLinkLocale>

      <div
        v-if="post.tasks && post.tasks.length > 0"
        class="flex flex-wrap gap-1.5 pt-1"
      >
        <UiTag
          v-for="task in post.tasks.slice(0, 2)"
          :key="task"
          size="sm"
        >
          {{ task }}
        </UiTag>
        <UiTag
          v-if="post.tasks.length > 2"
          size="sm"
        >
          +{{ post.tasks.length - 2 }}
        </UiTag>
      </div>
    </div>

    <div class="space-y-3 border-t border-black/5 pt-3 dark:border-white/5">
      <div class="grid grid-cols-2 gap-2 text-xs text-black/60 dark:text-white/60">
        <div class="inline-flex items-center gap-1.5 truncate">
          <UiIcon
            name="map-pin"
            :size="13"
            class="shrink-0 text-brand-600 dark:text-brand-400"
          />
          <span class="truncate">{{ placeLabel(post) }}</span>
        </div>
        <div class="inline-flex items-center gap-1.5 truncate">
          <UiIcon
            name="calendar"
            :size="13"
            class="shrink-0 text-brand-600 dark:text-brand-400"
          />
          <span class="truncate">{{ post.preferredDate ? dateLabel(post.preferredDate) : t('marketplace.job.anyDate') }}</span>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2">
        <div>
          <span class="block text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">
            {{ t('marketplace.job.budget') }}
          </span>
          <span class="font-display text-sm font-bold text-gray-900 dark:text-white">
            {{ budgetLabel(post.budget) }}
          </span>
        </div>

        <NuxtLinkLocale
          :to="`/jobs/${post.id}`"
          class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          <span>{{ t('marketplace.job.details') }}</span>
          <UiIcon
            name="arrow-right"
            :size="12"
          />
        </NuxtLinkLocale>
      </div>
    </div>
  </article>
</template>
