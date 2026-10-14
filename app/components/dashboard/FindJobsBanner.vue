<script setup lang="ts">
// Auto-imported as <DashboardFindJobsBanner/>. The provider's Seek Job entry on the dashboard home: how many open jobs
// match their services and how many of their applications are waiting for an answer.
defineProps<{
  matchingJobs: number
  pendingApplications: number
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-black/[0.02] px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
    <div class="flex items-center gap-3.5">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
        <UiIcon
          name="search"
          :size="18"
        />
      </span>
      <div>
        <div class="text-sm font-bold">
          {{ t('findJobs.title') }}
        </div>
        <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
          {{ matchingJobs > 0 ? t('findJobs.banner.matching', { count: matchingJobs }, matchingJobs) : t('findJobs.banner.none') }}
          <template v-if="pendingApplications > 0">
            · {{ t('findJobs.banner.pending', { count: pendingApplications }) }}
          </template>
        </div>
      </div>
    </div>
    <div class="flex gap-2">
      <NuxtLinkLocale
        v-if="pendingApplications > 0"
        to="/find-jobs/applications"
        :class="linkButtonClass('secondary')"
      >
        {{ t('findJobs.banner.applications') }}
      </NuxtLinkLocale>
      <NuxtLinkLocale
        to="/find-jobs"
        :class="linkButtonClass('primary')"
      >
        {{ t('findJobs.banner.view') }}
      </NuxtLinkLocale>
    </div>
  </div>
</template>
