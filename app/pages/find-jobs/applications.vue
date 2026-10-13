<script setup lang="ts">
import type { JobApplicationMine, JobApplicationMineListMeta } from '#shared/types/jobPosts'

// Every job a provider applied to, and where it stands. Changing an offer happens on the job's own page.
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'provider'],
  hideBottomNav: true,
})

const { t } = useI18n()
const toast = useToast()
const { confirm } = useConfirm()
const jobError = useJobErrors()
const { money } = useSiteSettings()
const { budgetLabel, relativeLabel } = useJobLabels()

const TABS = ['all', 'pending', 'hired', 'not_selected', 'declined', 'withdrawn'] as const
const tab = ref<(typeof TABS)[number]>('all')

const list = await usePagedList<JobApplicationMine, JobApplicationMineListMeta>('/dashboard/job-post-applications', {
  key: 'find-job-applications',
  query: computed(() => ({ status: tab.value === 'all' ? undefined : tab.value })),
})

const tabOptions = computed(() => TABS.map((value) => {
  const counts = list.meta.value?.counts
  const count = !counts ? 0 : value === 'all' ? Object.values(counts).reduce((sum, n) => sum + n, 0) : counts[value]
  return { value, label: t(`findJobs.applications.tabs.${value}`), count }
}))

async function withdraw(application: JobApplicationMine) {
  const ok = await confirm({
    title: t('findJobs.detail.withdrawConfirm.title'),
    message: t('findJobs.detail.withdrawConfirm.message'),
    confirmLabel: t('findJobs.detail.withdrawConfirm.confirm'),
    tone: 'danger',
  })
  if (!ok) return
  try {
    await useApiFetch(`/api/dashboard/job-post-applications/${application.id}/withdraw`, { method: 'POST' })
    toast.success(t('findJobs.detail.withdrawConfirm.done'))
    await Promise.all([list.refresh(), refreshNuxtData('find-jobs-feed')])
  }
  catch (e) {
    toast.error(jobError(e))
  }
}

useSeoMeta({ title: t('findJobs.applications.title') })
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/find-jobs" />

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('findJobs.applications.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('findJobs.applications.subtitle') }}
        </p>
      </div>
      <NuxtLinkLocale
        to="/find-jobs"
        :class="linkButtonClass('primary')"
      >
        {{ t('findJobs.applications.empty.cta') }}
      </NuxtLinkLocale>
    </div>

    <DashboardFilterTabs
      :model-value="tab"
      :options="tabOptions"
      @update:model-value="tab = $event as typeof tab"
    />

    <ul
      v-if="list.items.value.length > 0"
      class="flex flex-col gap-3"
    >
      <li
        v-for="application in list.items.value"
        :key="application.id"
        class="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-black/30"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <NuxtLinkLocale
              :to="`/find-jobs/${application.postId}`"
              class="truncate font-display text-base font-bold hover:underline"
            >
              {{ application.post?.title }}
            </NuxtLinkLocale>
            <p class="mt-0.5 text-xs text-black/50 dark:text-white/50">
              {{ application.post?.categoryName }}<template v-if="application.post?.categoryName">
                ·
              </template>{{ application.post?.cityName }}<template v-if="application.post?.cityName">
                ·
              </template>{{ application.post ? budgetLabel(application.post.budget) : '' }}
            </p>
          </div>
          <UiTag :variant="application.status === 'hired' ? 'primary' : application.status === 'pending' ? 'accent' : 'neutral'">
            {{ t(`findJobs.applications.tabs.${application.status}`) }}
          </UiTag>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span class="font-semibold">{{ t('findJobs.applications.row.offer', { amount: money(application.offerPrice), hours: application.offerHours }) }}</span>
          <span class="text-xs text-black/50 dark:text-white/50">{{ t('findJobs.applications.row.applied', { when: relativeLabel(application.createdAt) }) }}</span>
          <span
            v-if="application.post && application.post.status !== 'open' && application.status === 'pending'"
            class="text-xs font-semibold text-black/60 dark:text-white/60"
          >{{ t('findJobs.applications.row.postClosed', { status: t(`seekJob.status.${application.post.status}`).toLowerCase() }) }}</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <NuxtLinkLocale
            :to="`/find-jobs/${application.postId}`"
            :class="linkButtonClass('secondary')"
          >
            {{ t('findJobs.applications.row.viewJob') }}
          </NuxtLinkLocale>
          <UiButton
            v-if="application.can.withdraw"
            variant="ghost"
            size="sm"
            @click="withdraw(application)"
          >
            {{ t('findJobs.detail.withdraw') }}
          </UiButton>
        </div>
      </li>
    </ul>

    <div
      v-else
      class="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15"
    >
      <p class="font-display text-lg font-bold">
        {{ t('findJobs.applications.empty.title') }}
      </p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-black/60 dark:text-white/60">
        {{ t('findJobs.applications.empty.hint') }}
      </p>
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
