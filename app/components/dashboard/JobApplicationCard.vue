<script setup lang="ts">
import type { MessageMeta } from '#shared/types/dashboard'

// Auto-imported as <DashboardJobApplicationCard/>. The card that opens a chat about a Seek Job application: which job
// and which offer it is about, and, from the live state, what the viewer can do (hire, change the offer, open the
// booking). The consumer hires from here or from the job's page; a quote sent in this thread does not book the job.
const props = defineProps<{
  meta: MessageMeta
  fromMe: boolean
}>()

const emit = defineEmits<{
  'hire': [payload: { postId: string, applicationId: string }]
  'view-booking': [bookingId: string]
}>()

const { t, locale } = useI18n()
const { money } = useSiteSettings()

const current = computed(() => props.meta.current ?? null)
// The live numbers when we have them (the offer may have been edited since), else the snapshot in the message.
const price = computed(() => current.value?.offerPrice ?? props.meta.offerPrice ?? 0)
const hours = computed(() => current.value?.offerHours ?? props.meta.offerHours ?? 0)
const proposedAt = computed(() => current.value?.proposedAt ?? props.meta.proposedAt ?? null)
const postId = computed(() => current.value?.postId ?? props.meta.jobPostId ?? '')
const title = computed(() => current.value?.postTitle ?? props.meta.title ?? '')
const isConsumer = computed(() => current.value?.isConsumer ?? props.fromMe)
const postPath = computed(() => (isConsumer.value ? `/seek-job/${postId.value}` : `/find-jobs/${postId.value}`))
</script>

<template>
  <div
    class="w-72 max-w-full overflow-hidden rounded-xl border bg-white text-black dark:bg-black/40 dark:text-white"
    :class="fromMe ? 'border-brand-600/40' : 'border-black/10 dark:border-white/15'"
  >
    <div class="flex items-center gap-2 border-b border-black/10 bg-brand-50 px-3.5 py-2 dark:border-white/10 dark:bg-brand-700/20">
      <UiIcon
        name="briefcase"
        :size="14"
        class="text-brand-700 dark:text-brand-100"
      />
      <span class="text-xs font-bold text-brand-700 dark:text-brand-100">{{ t('dashboard.messages.jobApplication.heading') }}</span>
    </div>

    <div class="flex flex-col gap-2 px-3.5 py-3 text-sm">
      <NuxtLinkLocale
        v-if="postId"
        :to="postPath"
        class="font-bold hover:underline"
      >
        {{ title }}
      </NuxtLinkLocale>
      <p
        v-else
        class="font-bold"
      >
        {{ title }}
      </p>

      <p class="text-xs text-black/70 dark:text-white/70">
        {{ t('seekJob.applicant.offer.price', { amount: money(price), hours }) }}
        <template v-if="proposedAt">
          <br>{{ t('seekJob.applicant.offer.date', { when: formatDateTime(proposedAt, locale) }) }}
        </template>
      </p>

      <p
        v-if="current"
        class="text-xs font-semibold text-black/60 dark:text-white/60"
      >
        {{ t(`dashboard.messages.jobApplication.status.${current.status}`) }}
      </p>
      <p
        v-else
        class="text-xs text-black/50 dark:text-white/50"
      >
        {{ t('dashboard.messages.jobApplication.unavailable') }}
      </p>

      <div
        v-if="current"
        class="flex flex-wrap gap-2 pt-1"
      >
        <UiButton
          v-if="current.canHire"
          variant="primary"
          size="sm"
          @click="emit('hire', { postId: current.postId, applicationId: current.applicationId })"
        >
          {{ t('seekJob.applicant.actions.hire') }}
        </UiButton>
        <NuxtLinkLocale
          v-if="current.canEditOffer"
          :to="postPath"
          :class="linkButtonClass('secondary')"
        >
          {{ t('findJobs.detail.editOffer') }}
        </NuxtLinkLocale>
        <UiButton
          v-if="current.bookingId"
          variant="secondary"
          size="sm"
          @click="emit('view-booking', current.bookingId)"
        >
          {{ t('dashboard.messages.viewBooking') }}
        </UiButton>
      </div>

      <p
        v-if="current && !isConsumer && current.status === 'pending'"
        class="text-[11px] text-black/50 dark:text-white/50"
      >
        {{ t('dashboard.messages.jobApplication.providerHint') }}
      </p>
    </div>
  </div>
</template>
