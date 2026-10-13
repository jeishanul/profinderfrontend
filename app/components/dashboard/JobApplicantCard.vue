<script setup lang="ts">
import type { JobApplicant } from '#shared/types/jobPosts'

// Auto-imported as <DashboardJobApplicantCard/>. One provider's application on the consumer's post: who they are, what
// they offer and why, and the actions that make sense for where it stands.
const props = defineProps<{
  applicant: JobApplicant
  busy?: boolean
}>()

const emit = defineEmits<{
  hire: []
  decline: []
  message: []
}>()

const { t, locale } = useI18n()
const { money } = useSiteSettings()

const provider = computed(() => props.applicant.provider)
const isPending = computed(() => props.applicant.status === 'pending')
const offerDatePassed = computed(() => isPending.value && new Date(props.applicant.proposedAt).getTime() < Date.now())

const ratingText = computed(() => {
  if (provider.value.reviewCount === 0) return t('seekJob.applicant.noReviews')
  return provider.value.reviewCount === 1
    ? t('seekJob.applicant.ratingOne', { rating: provider.value.rating.toFixed(1) })
    : t('seekJob.applicant.rating', { rating: provider.value.rating.toFixed(1), count: provider.value.reviewCount })
})

// Why "Hire" isn't offered, so the card never just goes quiet.
const hireHint = computed(() => {
  if (!isPending.value || props.applicant.can.hire) return null
  if (!provider.value.verified) return t('seekJob.applicant.hints.mustVerify')
  if (offerDatePassed.value) return t('seekJob.applicant.hints.datePassed')
  return null
})
</script>

<template>
  <article
    class="flex flex-col gap-4 rounded-2xl border bg-white/70 p-5 dark:bg-black/30"
    :class="applicant.status === 'hired' ? 'border-brand-500' : 'border-black/10 dark:border-white/10'"
  >
    <header class="flex items-start gap-3.5">
      <UiAvatar
        :name="provider.name"
        :src="provider.avatarUrl"
        size-class="h-12 w-12 rounded-2xl"
        text-class="text-base"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <NuxtLinkLocale
            :to="`/providers/${provider.id}`"
            class="truncate font-display text-base font-bold hover:underline"
          >
            {{ provider.name }}
          </NuxtLinkLocale>
          <UiTag
            v-if="provider.verified"
            variant="primary"
            size="sm"
          >
            <UiIcon
              name="shield-check"
              :size="11"
            />{{ t('seekJob.applicant.verified') }}
          </UiTag>
          <UiTag
            v-else
            variant="neutral"
            size="sm"
          >
            {{ t('seekJob.applicant.unverified') }}
          </UiTag>
          <UiTag
            v-if="applicant.isTopMatch"
            variant="accent"
            size="sm"
          >
            {{ t('seekJob.applicant.topMatch') }}
          </UiTag>
          <UiTag
            v-if="applicant.isNew"
            variant="accent"
            size="sm"
          >
            {{ t('seekJob.applicant.new') }}
          </UiTag>
          <UiTag
            v-if="applicant.status === 'hired'"
            variant="primary"
            size="sm"
          >
            {{ t('seekJob.applicant.hiredBadge') }}
          </UiTag>
          <UiTag
            v-else-if="applicant.status !== 'pending'"
            variant="neutral"
            size="sm"
          >
            {{ t(`seekJob.applicant.status.${applicant.status}`) }}
          </UiTag>
        </div>
        <p
          v-if="provider.headline"
          class="mt-0.5 truncate text-xs text-black/50 dark:text-white/50"
        >
          {{ provider.headline }}
        </p>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/60 dark:text-white/60">
          <UiRating
            v-if="provider.reviewCount > 0"
            :rating="provider.rating"
          />
          <span>{{ ratingText }}</span>
          <span>{{ t('seekJob.applicant.jobsDone', { count: provider.jobsCompleted }) }}</span>
          <span
            v-if="provider.sameCity"
            class="font-semibold text-brand-700 dark:text-brand-100"
          >{{ t('seekJob.applicant.sameCity') }}</span>
          <span
            v-else-if="provider.sameProvince"
            class="font-semibold text-brand-700 dark:text-brand-100"
          >{{ t('seekJob.applicant.sameProvince') }}</span>
        </div>
      </div>
    </header>

    <div class="rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.06]">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <span class="font-display text-lg font-bold">{{ t('seekJob.applicant.offer.price', { amount: money(applicant.offerPrice), hours: applicant.offerHours }) }}</span>
        <span class="text-xs text-black/60 dark:text-white/60">{{ t('seekJob.applicant.offer.date', { when: formatDateTime(applicant.proposedAt, locale) }) }}</span>
      </div>
      <p
        v-if="applicant.extraHourlyRate !== null"
        class="mt-0.5 text-xs text-black/60 dark:text-white/60"
      >
        {{ t('seekJob.applicant.offer.extra', { rate: money(applicant.extraHourlyRate) }) }}
      </p>
      <p class="mt-3 text-sm whitespace-pre-line text-black/80 dark:text-white/80">
        {{ applicant.note }}
      </p>
      <p
        v-if="applicant.offerBeforeEdit"
        class="mt-3 text-xs font-semibold text-accent-700 dark:text-accent-100"
      >
        {{ t('seekJob.applicant.offer.beforeEdit') }}
      </p>
      <p
        v-if="applicant.declineReason"
        class="mt-3 text-xs text-black/50 dark:text-white/50"
      >
        “{{ applicant.declineReason }}”
      </p>
    </div>

    <p
      v-if="hireHint"
      class="text-xs text-black/60 dark:text-white/60"
    >
      {{ hireHint }}
    </p>

    <footer class="flex flex-wrap items-center gap-2">
      <UiButton
        v-if="applicant.can.hire"
        variant="primary"
        size="sm"
        :disabled="busy"
        @click="emit('hire')"
      >
        {{ t('seekJob.applicant.actions.hire') }}
      </UiButton>
      <UiButton
        v-if="applicant.can.message || applicant.conversationId"
        variant="secondary"
        size="sm"
        :disabled="busy"
        @click="emit('message')"
      >
        <UiIcon
          name="message"
          :size="14"
        />{{ t('seekJob.applicant.actions.message') }}
      </UiButton>
      <UiButton
        v-if="applicant.can.decline"
        variant="ghost"
        size="sm"
        :disabled="busy"
        @click="emit('decline')"
      >
        {{ t('seekJob.applicant.actions.decline') }}
      </UiButton>
    </footer>
  </article>
</template>
