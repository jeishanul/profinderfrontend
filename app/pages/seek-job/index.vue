<script setup lang="ts">
import type { JobPost, JobPostListMeta } from '#shared/types/jobPosts'

// A consumer's own job posts, by stage. Posting a job lives at /seek-job/new; a post's applicants at /seek-job/:id.
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()

const TABS = ['open', 'hired', 'completed', 'closed'] as const
const tab = ref<(typeof TABS)[number]>('open')

const list = await usePagedList<JobPost, JobPostListMeta>('/dashboard/job-posts', {
  key: 'seek-job-posts',
  query: computed(() => ({ status: tab.value })),
})

const tabOptions = computed(() => TABS.map(value => ({
  value,
  label: t(`seekJob.tabs.${value}`),
  count: list.meta.value?.counts[value] ?? 0,
})))

useSeoMeta({ title: t('seekJob.title') })
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('seekJob.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('seekJob.subtitle') }}
        </p>
      </div>
      <NuxtLinkLocale
        to="/seek-job/new"
        :class="linkButtonClass('primary')"
      >
        <UiIcon
          name="plus"
          :size="15"
        />{{ t('seekJob.postJob') }}
      </NuxtLinkLocale>
    </div>

    <DashboardFilterTabs
      :model-value="tab"
      :options="tabOptions"
      @update:model-value="tab = $event as typeof tab"
    />

    <div
      v-if="list.items.value.length > 0"
      class="grid gap-4 lg:grid-cols-2"
    >
      <DashboardJobPostCard
        v-for="post in list.items.value"
        :key="post.id"
        :post="post"
      />
    </div>

    <div
      v-else
      class="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15"
    >
      <p class="font-display text-lg font-bold">
        {{ t('seekJob.empty.title') }}
      </p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-black/60 dark:text-white/60">
        {{ tab === 'open' ? t('seekJob.empty.openHint') : t('seekJob.empty.otherHint') }}
      </p>
      <NuxtLinkLocale
        v-if="tab === 'open'"
        to="/seek-job/new"
        :class="[linkButtonClass('primary'), 'mt-5']"
      >
        {{ t('seekJob.postJob') }}
      </NuxtLinkLocale>
    </div>

    <DashboardLoadMore
      :shown="list.items.value.length"
      :total="list.meta.value?.total ?? 0"
      :has-more="list.hasMore.value"
      :loading="list.loadingMore.value"
      :failed="list.loadMoreFailed.value"
      @more="list.loadMore()"
    />
  </div>
</template>
