<script setup lang="ts">
import type { Quote } from '#shared/types/dashboard'

// Auto-imported as <DashboardQuoteCard/>. Renders in place of a plain
// text/attachment bubble when a message carries a structured `quote` (see
// `shared/types/dashboard.ts`).
//   - The client (`canRespond`) sees Accept/Decline while the quote is pending.
//   - The provider who sent it (`isOwn`) sees Edit/Withdraw while it is pending.
//   - Once accepted, either side can jump to the booking it created.
// The backend (`QuoteController`) enforces the same rules; these flags only
// decide which buttons to show.
const props = defineProps<{
  quote: Quote
  canRespond: boolean
  isOwn: boolean
  /** An action on this quote is in flight — disables the buttons. */
  busy?: boolean
}>()

defineEmits<{
  'accept': []
  'decline': []
  'edit': []
  'withdraw': []
  'view-booking': [bookingId: string]
}>()

const { t, locale } = useI18n()
const { money } = useSiteSettings()

const isPending = computed(() => props.quote.status === 'pending')

const STATUS_LABEL: Record<Quote['status'], string> = {
  pending: 'pending',
  accepted: 'accepted',
  declined: 'declined',
  withdrawn: 'withdrawn',
  expired: 'expired',
}
</script>

<template>
  <div class="w-64 max-w-full overflow-hidden rounded-xl border border-black/10 bg-white text-black dark:border-white/15 dark:bg-black/40 dark:text-white">
    <div class="flex items-center gap-2 border-b border-black/10 bg-accent-50 px-3.5 py-2 dark:border-white/10 dark:bg-accent-700/20">
      <UiIcon
        name="briefcase"
        :size="14"
        class="text-accent-700 dark:text-accent-100"
      />
      <span class="text-xs font-bold text-accent-700 dark:text-accent-100">{{ t('dashboard.messages.quote.cardHeading') }}</span>
    </div>
    <div class="flex flex-col gap-2 px-3.5 py-3">
      <div class="flex items-baseline justify-between">
        <span class="font-display text-lg font-bold">{{ money(quote.basePriceUsd) }}</span>
        <span class="text-xs text-black/50 dark:text-white/50">{{ t('dashboard.messages.quote.forHours', { hours: quote.baseHours }) }}</span>
      </div>
      <p
        v-if="quote.extraHourlyRateUsd > 0"
        class="text-xs text-black/60 dark:text-white/60"
      >
        {{ t('dashboard.messages.quote.extraRateNote', { rate: money(quote.extraHourlyRateUsd) }) }}
      </p>

      <dl class="flex flex-col gap-1 text-xs text-black/70 dark:text-white/70">
        <div
          v-if="quote.serviceTitle"
          class="flex items-start gap-1.5"
        >
          <UiIcon
            name="briefcase"
            :size="12"
            class="mt-0.5 shrink-0 text-black/40 dark:text-white/40"
          />
          <dd>{{ quote.serviceTitle }}</dd>
        </div>
        <div
          v-if="quote.scheduledAt"
          class="flex items-start gap-1.5"
        >
          <UiIcon
            name="calendar"
            :size="12"
            class="mt-0.5 shrink-0 text-black/40 dark:text-white/40"
          />
          <dd class="font-semibold">
            {{ formatDateTime(quote.scheduledAt, locale) }}
          </dd>
        </div>
        <div
          v-if="quote.address"
          class="flex items-start gap-1.5"
        >
          <UiIcon
            name="map-pin"
            :size="12"
            class="mt-0.5 shrink-0 text-black/40 dark:text-white/40"
          />
          <dd>{{ quote.address }}</dd>
        </div>
      </dl>

      <p
        v-if="quote.note"
        class="text-xs text-black/60 dark:text-white/60"
      >
        {{ quote.note }}
      </p>
      <p
        v-if="isPending && quote.expiresAt"
        class="text-[11px] text-black/45 dark:text-white/45"
      >
        {{ t('dashboard.messages.quote.expiresAt', { when: formatDateTime(quote.expiresAt, locale) }) }}
      </p>

      <div
        v-if="isPending && canRespond"
        class="mt-1.5 flex gap-2"
      >
        <UiButton
          variant="primary"
          size="sm"
          class="flex-1"
          :disabled="busy"
          @click="$emit('accept')"
        >
          {{ t('dashboard.messages.quote.accept') }}
        </UiButton>
        <UiButton
          variant="ghost"
          size="sm"
          class="flex-1"
          :disabled="busy"
          @click="$emit('decline')"
        >
          {{ t('dashboard.messages.quote.decline') }}
        </UiButton>
      </div>
      <div
        v-else-if="isPending && isOwn"
        class="mt-1.5 flex gap-2"
      >
        <UiButton
          variant="ghost"
          size="sm"
          class="flex-1"
          :disabled="busy"
          @click="$emit('edit')"
        >
          {{ t('dashboard.messages.quote.edit') }}
        </UiButton>
        <UiButton
          variant="ghost"
          size="sm"
          class="flex-1"
          :disabled="busy"
          @click="$emit('withdraw')"
        >
          {{ t('dashboard.messages.quote.withdraw') }}
        </UiButton>
      </div>
      <template v-else>
        <UiTag
          :variant="quote.status === 'accepted' ? 'primary' : 'neutral'"
          class="mt-1 w-fit"
        >
          {{ t(`dashboard.messages.quote.${STATUS_LABEL[quote.status]}`) }}
        </UiTag>
        <UiButton
          v-if="quote.status === 'accepted' && quote.bookingId"
          variant="ghost"
          size="sm"
          @click="$emit('view-booking', quote.bookingId)"
        >
          {{ t('dashboard.messages.quote.viewBooking') }}
        </UiButton>
      </template>
    </div>
  </div>
</template>
