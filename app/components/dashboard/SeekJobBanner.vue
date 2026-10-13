<script setup lang="ts">
// Auto-imported as <DashboardSeekJobBanner/>. The consumer's Seek Job entry on the dashboard home: how their posts are
// doing and a way to post another.
defineProps<{
  openPosts: number
  newApplicants: number
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-black/[0.02] px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
    <div class="flex items-center gap-3.5">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
        <UiIcon
          name="briefcase"
          :size="18"
        />
      </span>
      <div>
        <div class="flex items-center gap-2 text-sm font-bold">
          {{ t('seekJob.title') }}
          <UiTag
            v-if="newApplicants > 0"
            variant="accent"
            size="sm"
          >
            {{ t('seekJob.card.newApplicants', { count: newApplicants }) }}
          </UiTag>
        </div>
        <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
          {{ openPosts > 0 ? t('seekJob.banner.open', { count: openPosts }, openPosts) : t('seekJob.banner.none') }}
        </div>
      </div>
    </div>
    <div class="flex gap-2">
      <NuxtLinkLocale
        v-if="openPosts > 0"
        to="/seek-job"
        :class="linkButtonClass('secondary')"
      >
        {{ t('seekJob.banner.view') }}
      </NuxtLinkLocale>
      <NuxtLinkLocale
        to="/seek-job/new"
        :class="linkButtonClass('primary')"
      >
        {{ t('seekJob.postJob') }}
      </NuxtLinkLocale>
    </div>
  </div>
</template>
