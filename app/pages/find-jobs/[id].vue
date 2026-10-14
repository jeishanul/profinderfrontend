<script setup lang="ts">
import type { KycState } from '#shared/types/dashboard'
import type { JobApplicationMine, JobOfferPayload, JobPostForProvider } from '#shared/types/jobPosts'

// A job as a provider sees it: what it asks for, where (the area, never the street address), and where they stand on
// it. This is where they apply with an offer, change a pending offer, or withdraw.
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'provider'],
  hideBottomNav: true,
})

const { t, locale } = useI18n()
const route = useRoute()
const toast = useToast()
const { confirm } = useConfirm()
const jobError = useJobErrors()
const { money } = useSiteSettings()
const { budgetLabel, timeLabel, dateLabel, placeLabel, relativeLabel } = useJobLabels()

const id = String(route.params.id)
const { data: post, error, refresh } = await useApi<JobPostForProvider & { myApplication: JobApplicationMine | null }>(`/dashboard/seek-jobs/${id}`, { key: `find-job-${id}` })

if (error.value || !post.value) {
  throw createError({ statusCode: apiErrorStatus(error.value) ?? 404, statusMessage: t('errors.notFound'), fatal: true })
}

// Verification decides whether a client can hire them (applying is open to everyone), so say so up front.
const { data: kyc } = useApi<KycState>('/dashboard/kyc', { key: 'dashboard-kyc', lazy: true, server: false })
const needsVerification = computed(() => kyc.value !== null && kyc.value !== undefined && !kyc.value.isVerified)

const application = computed(() => post.value?.myApplication ?? null)
const isOpen = computed(() => post.value?.status === 'open')
// A withdrawn application can be made again while the job is open; anything else is a live (or finished) one.
const hasActiveApplication = computed(() => application.value !== null && application.value.status !== 'withdrawn')

// What a provider is told when the job is no longer taking applications.
const closedBannerKey = computed(() => {
  const p = post.value!
  if (p.status === 'open') return null
  return p.status === 'closed' && p.closedReason === 'expired' ? 'expired' : p.status
})

// --- applying / editing --------------------------------------------------------------------------------------------
const isApplyOpen = ref(false)
const submitting = ref(false)
const applyErrors = ref<Record<string, string>>({})

async function submit(payload: JobOfferPayload) {
  submitting.value = true
  applyErrors.value = {}
  try {
    if (hasActiveApplication.value && application.value) {
      await useApiFetch(`/api/dashboard/job-post-applications/${application.value.id}`, { method: 'PATCH', body: payload })
      toast.success(t('findJobs.apply.saved'))
    }
    else {
      await useApiFetch(`/api/dashboard/seek-jobs/${id}/apply`, { method: 'POST', body: payload })
      toast.success(t('findJobs.apply.done'))
    }
    isApplyOpen.value = false
    await Promise.all([refresh(), refreshNuxtData('find-jobs-feed'), refreshNuxtData('find-job-applications')])
  }
  catch (e) {
    const fields = apiFieldErrors(e)
    applyErrors.value = Object.keys(fields).length > 0 ? fields : { form: jobError(e, 'findJobs.apply.errors.submit') }
    // The job may have closed or filled up while the form was open: refresh what's behind the dialog.
    if (['post_not_open', 'applications_full', 'already_applied'].includes(apiErrorCode(e) ?? '')) await refresh()
  }
  finally {
    submitting.value = false
  }
}

async function withdraw() {
  if (!application.value) return
  const ok = await confirm({
    title: t('findJobs.detail.withdrawConfirm.title'),
    message: t('findJobs.detail.withdrawConfirm.message'),
    confirmLabel: t('findJobs.detail.withdrawConfirm.confirm'),
    tone: 'danger',
  })
  if (!ok) return
  try {
    await useApiFetch(`/api/dashboard/job-post-applications/${application.value.id}/withdraw`, { method: 'POST' })
    toast.success(t('findJobs.detail.withdrawConfirm.done'))
    await Promise.all([refresh(), refreshNuxtData('find-jobs-feed'), refreshNuxtData('find-job-applications')])
  }
  catch (e) {
    toast.error(jobError(e))
  }
}

const lightboxIndex = ref<number | null>(null)
const isReportOpen = ref(false)

useSeoMeta({ title: () => post.value?.title ?? t('findJobs.title') })
</script>

<template>
  <div
    v-if="post"
    class="flex flex-col gap-6"
  >
    <UiBackButton fallback="/find-jobs" />

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="font-display text-2xl font-bold">
          {{ post.title }}
        </h1>
        <p class="mt-1 text-xs text-black/50 dark:text-white/50">
          {{ post.categoryName }}<template v-if="post.categoryName">
            ·
          </template>{{ t('findJobs.card.posted', { when: relativeLabel(post.createdAt) }) }}
          <template v-if="post.postedBy.name">
            · {{ t('findJobs.detail.postedBy', { name: post.postedBy.name }) }}
          </template>
        </p>
      </div>
      <UiButton
        v-if="isOpen && !hasActiveApplication"
        variant="primary"
        @click="applyErrors = {}; isApplyOpen = true"
      >
        {{ application ? t('findJobs.detail.applyAgain') : t('findJobs.detail.apply') }}
      </UiButton>
    </div>

    <p
      v-if="closedBannerKey"
      class="rounded-xl bg-black/5 px-4 py-3 text-sm font-semibold text-black/70 dark:bg-white/10 dark:text-white/70"
    >
      {{ t(`findJobs.detail.closedBanner.${closedBannerKey}`) }}
    </p>
    <p
      v-else-if="needsVerification"
      class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold text-accent-700 dark:bg-accent-700/20 dark:text-accent-100"
    >
      {{ t('findJobs.detail.unverifiedBanner') }}
      <NuxtLinkLocale
        :to="{ path: '/profile', query: { tab: 'kyc' } }"
        class="underline"
      >
        {{ t('findJobs.detail.verifyCta') }}
      </NuxtLinkLocale>
    </p>

    <section
      v-if="application && application.status !== 'withdrawn' || (application && !isOpen)"
      class="flex flex-col gap-3 rounded-2xl border border-brand-500/40 p-5 sm:p-6"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-lg font-bold">
          {{ t('findJobs.detail.myApplication') }}
        </h2>
        <UiTag :variant="application.status === 'hired' ? 'primary' : 'neutral'">
          {{ t(`findJobs.applications.tabs.${application.status}`) }}
        </UiTag>
      </div>
      <p class="text-sm text-black/70 dark:text-white/70">
        {{ t(`findJobs.detail.statusText.${application.status}`) }}
      </p>
      <div class="rounded-xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.06]">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <span class="font-display text-lg font-bold">{{ t('seekJob.applicant.offer.price', { amount: money(application.offerPrice), hours: application.offerHours }) }}</span>
          <span class="text-xs text-black/60 dark:text-white/60">{{ t('seekJob.applicant.offer.date', { when: formatDateTime(application.proposedAt, locale) }) }}</span>
        </div>
        <p
          v-if="application.extraHourlyRate !== null"
          class="mt-0.5 text-xs text-black/60 dark:text-white/60"
        >
          {{ t('seekJob.applicant.offer.extra', { rate: money(application.extraHourlyRate) }) }}
        </p>
        <p class="mt-3 whitespace-pre-line">
          {{ application.note }}
        </p>
        <p
          v-if="application.declineReason"
          class="mt-3 text-xs text-black/50 dark:text-white/50"
        >
          “{{ application.declineReason }}”
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton
          v-if="application.can.edit"
          variant="secondary"
          size="sm"
          @click="applyErrors = {}; isApplyOpen = true"
        >
          {{ t('findJobs.detail.editOffer') }}
        </UiButton>
        <UiButton
          v-if="application.can.withdraw"
          variant="ghost"
          size="sm"
          @click="withdraw"
        >
          {{ t('findJobs.detail.withdraw') }}
        </UiButton>
        <NuxtLinkLocale
          v-if="application.bookingId"
          :to="{ path: '/clients', query: { booking: application.bookingId } }"
          :class="linkButtonClass('primary')"
        >
          {{ t('findJobs.detail.viewBooking') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          v-if="application.conversationId"
          :to="{ path: '/messages', query: { conversation: application.conversationId } }"
          :class="linkButtonClass('secondary')"
        >
          {{ t('seekJob.applicant.actions.message') }}
        </NuxtLinkLocale>
      </div>
    </section>

    <section class="grid gap-6 rounded-2xl border border-black/10 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px] dark:border-white/10">
      <div class="min-w-0">
        <p class="text-sm whitespace-pre-line text-black/80 dark:text-white/80">
          {{ post.description }}
        </p>
        <h2 class="mt-5 mb-2 text-xs font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('seekJob.form.fields.tasks.label') }}
        </h2>
        <ul class="flex flex-col gap-1.5 text-sm">
          <li
            v-for="task in post.tasks"
            :key="task"
            class="flex items-start gap-2"
          >
            <UiIcon
              name="check"
              :size="14"
              class="mt-0.5 shrink-0 text-brand-600"
            />{{ task }}
          </li>
        </ul>
        <ul
          v-if="post.photos.length > 0"
          class="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4"
        >
          <li
            v-for="(photo, index) in post.photos"
            :key="photo.id"
          >
            <button
              v-if="photo.available"
              type="button"
              class="aspect-square w-full overflow-hidden rounded-xl bg-black/5 dark:bg-white/10"
              :aria-label="t('marketplace.providerProfile.openPhoto', { number: index + 1 })"
              @click="lightboxIndex = index"
            >
              <img
                :src="photo.url"
                :alt="post.title"
                loading="lazy"
                class="h-full w-full object-cover"
              >
            </button>
            <span
              v-else
              class="flex aspect-square items-center justify-center rounded-xl bg-black/5 p-2 text-center text-[11px] text-black/50 dark:bg-white/10 dark:text-white/50"
            >{{ t('seekJob.form.fields.photos.unavailable') }}</span>
          </li>
        </ul>
      </div>

      <dl class="flex flex-col gap-3.5 text-sm">
        <div>
          <dt class="text-xs text-black/50 dark:text-white/50">
            {{ t('findJobs.detail.area') }}
          </dt>
          <dd class="font-semibold">
            {{ placeLabel(post) }}
          </dd>
          <dd class="text-xs text-black/60 dark:text-white/60">
            {{ t('findJobs.detail.areaHint') }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-black/50 dark:text-white/50">
            {{ t('seekJob.form.fields.date.label') }}
          </dt>
          <dd class="font-semibold">
            {{ post.preferredDate ? dateLabel(post.preferredDate) : t('seekJob.card.anyDate') }} · {{ timeLabel(post.preferredTime) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-black/50 dark:text-white/50">
            {{ t('seekJob.budget.label') }}
          </dt>
          <dd class="font-semibold">
            {{ budgetLabel(post.budget) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-black/50 dark:text-white/50">
            {{ t('seekJob.detail.applicants.heading') }}
          </dt>
          <dd class="font-semibold">
            {{ t('findJobs.card.applicants', { count: post.applicationsCount }, post.applicationsCount) }}
          </dd>
        </div>
      </dl>
    </section>

    <button
      type="button"
      class="self-start text-xs text-black/40 underline hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
      @click="isReportOpen = true"
    >
      {{ t('findJobs.detail.report') }}
    </button>

    <MarketplaceReportModal
      :open="isReportOpen"
      type="job_post"
      :target-id="post.id"
      @close="isReportOpen = false"
    />

    <DashboardJobApplyModal
      :open="isApplyOpen"
      :post="post"
      :application="hasActiveApplication ? application : null"
      :submitting="submitting"
      :errors="applyErrors"
      @close="isApplyOpen = false"
      @submit="submit"
    />

    <UiLightbox
      :photos="post.photos.filter(photo => photo.available)"
      :index="lightboxIndex"
      :label="post.title"
      @close="lightboxIndex = null"
      @update:index="(index) => (lightboxIndex = index)"
    />
  </div>
</template>
