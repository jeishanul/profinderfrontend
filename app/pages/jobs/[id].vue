<script setup lang="ts">
import type { JobPostBase } from '#shared/types/jobPosts'

const { t } = useI18n()
const route = useRoute()
const session = useSession()
const authModal = useAuthModal()
const localePath = useLocalePath()
const { budgetLabel, timeLabel, dateLabel, placeLabel, relativeLabel } = useJobLabels()
const { settings } = useSiteSettings()

const id = String(route.params.id)
const { data: post, error } = await useApi<JobPostBase>(`/jobs/${id}`, {
  key: `public-job-${id}`,
})

if (error.value || !post.value) {
  throw createError({
    statusCode: apiErrorStatus(error.value) ?? 404,
    statusMessage: t('errors.notFound'),
    fatal: true,
  })
}

function handleApplyClick() {
  if (!session.isAuthenticated.value) {
    authModal.open('login', {
      onSuccess: () => navigateTo(localePath(`/find-jobs/${id}`)),
    })
    return
  }

  if (session.user.value?.role === 'provider') {
    navigateTo(localePath(`/find-jobs/${id}`))
  }
  else {
    navigateTo(localePath('/become-a-provider'))
  }
}

useSeoMeta({
  title: () => `${post.value?.title} | ${settings.value.siteName ?? t('brand.name')}`,
  description: () => post.value?.description?.slice(0, 160) ?? t('publicJobs.seoDescription'),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="mb-6">
      <NuxtLinkLocale
        to="/jobs"
        class="inline-flex items-center gap-2 text-sm font-semibold text-black/60 transition hover:text-black dark:text-white/60 dark:hover:text-white"
      >
        <UiIcon
          name="arrow-left"
          :size="15"
        />
        <span>{{ t('publicJobs.backToJobs') }}</span>
      </NuxtLinkLocale>
    </div>

    <div
      v-if="post"
      class="space-y-8"
    >
      <!-- Header Card -->
      <div class="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/30">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="post.categoryName"
              class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
            >
              {{ post.categoryName }}
            </span>
            <DashboardJobPostStatusBadge :status="post.status" />
          </div>

          <span class="text-xs text-black/40 dark:text-white/40">
            {{ t('publicJobs.postedOn') }} {{ relativeLabel(post.createdAt) }}
          </span>
        </div>

        <h1 class="mt-4 font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
          {{ post.title }}
        </h1>

        <!-- Quick Summary Pills -->
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.02]">
            <span class="block text-xs uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">
              {{ t('publicJobs.budgetEstimate') }}
            </span>
            <span class="mt-1 block font-display text-lg font-bold text-gray-900 dark:text-white">
              {{ budgetLabel(post.budget) }}
            </span>
          </div>

          <div class="rounded-2xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.02]">
            <span class="block text-xs uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">
              {{ t('publicJobs.location') }}
            </span>
            <span class="mt-1 block font-display text-base font-semibold text-gray-900 dark:text-white truncate">
              {{ placeLabel(post) }}
            </span>
          </div>

          <div class="rounded-2xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.02]">
            <span class="block text-xs uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">
              {{ t('publicJobs.preferredSchedule') }}
            </span>
            <span class="mt-1 block font-display text-base font-semibold text-gray-900 dark:text-white truncate">
              {{ post.preferredDate ? `${dateLabel(post.preferredDate)} (${timeLabel(post.preferredTime)})` : timeLabel(post.preferredTime) }}
            </span>
          </div>
        </div>

        <!-- Apply CTA button -->
        <div class="mt-8 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-6 sm:flex-row dark:border-white/5">
          <div class="text-sm text-black/60 dark:text-white/60">
            {{ t('marketplace.job.applicants', { count: post.applicationsCount }, post.applicationsCount) }}
          </div>

          <UiButton
            variant="primary"
            size="lg"
            class="w-full sm:w-auto"
            @click="handleApplyClick"
          >
            {{ t('marketplace.job.apply') }}
          </UiButton>
        </div>
      </div>

      <!-- Description & Tasks -->
      <div class="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/30">
        <h2 class="font-display text-xl font-bold">
          {{ t('publicJobs.detailsHeading') }}
        </h2>
        <p class="mt-4 whitespace-pre-line text-base leading-relaxed text-black/80 dark:text-white/80">
          {{ post.description }}
        </p>

        <!-- Tasks checklist -->
        <div
          v-if="post.tasks && post.tasks.length > 0"
          class="mt-8 border-t border-black/5 pt-6 dark:border-white/5"
        >
          <h3 class="font-display text-base font-bold">
            {{ t('publicJobs.tasksHeading') }}
          </h3>
          <ul class="mt-3 space-y-2">
            <li
              v-for="task in post.tasks"
              :key="task"
              class="flex items-start gap-2.5 text-sm text-black/70 dark:text-white/70"
            >
              <UiIcon
                name="check"
                :size="16"
                class="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400"
              />
              <span>{{ task }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Notice for Guests -->
      <div class="rounded-2xl border border-brand-500/20 bg-brand-50/50 p-6 text-center dark:border-brand-500/30 dark:bg-brand-950/20">
        <h3 class="font-display text-base font-bold text-brand-900 dark:text-brand-100">
          {{ t('publicJobs.applyNotice') }}
        </h3>
        <p class="mt-1 text-xs text-brand-700/80 dark:text-brand-300/80">
          {{ t('findJobs.subtitle') }}
        </p>
        <div class="mt-4 flex flex-wrap justify-center gap-3">
          <UiButton
            v-if="!session.isAuthenticated.value"
            variant="secondary"
            size="sm"
            @click="authModal.open('login')"
          >
            {{ t('publicJobs.loginToApply') }}
          </UiButton>
          <NuxtLinkLocale
            to="/become-a-provider"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            {{ t('publicJobs.registerProvider') }}
          </NuxtLinkLocale>
        </div>
      </div>
    </div>
  </div>
</template>
