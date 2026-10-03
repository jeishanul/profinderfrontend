<script setup lang="ts">
import type { BookingDetail } from '#shared/types/dashboard'

// Auto-imported as <DashboardBookingDrawer/>. Everything about one booking —
// when/where/how much, who it's with, its timeline — and the actions the
// server says the viewer may take right now (`booking.can`). Mounted once in
// the dashboard layout (see `useBookingDrawer`), so Purchases, Clients, the
// overview and chat threads all open the same drawer.
const props = defineProps<{
  bookingId: string
  /** Open straight into the cancel-reason step. */
  startCancelling?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const localePath = useLocalePath()
const toast = useToast()
const bookAgain = useBookAgain()
const reviewForm = useReviewForm()
const categoryLabel = useCategoryLabel()
const titleId = useId()

const { data: booking, status, error, refresh } = useApi<BookingDetail>(`/dashboard/bookings/${props.bookingId}`, {
  key: `booking-${props.bookingId}`,
  lazy: true,
  server: false,
})

const refreshBookingLists = useRefreshBookingLists()
const isBusy = ref(false)
const cancelling = ref(props.startCancelling ?? false)
const cancelReason = ref('')
const extraHours = ref(0)
const fieldErrors = ref<Record<string, string>>({})

/** Runs one booking action; on success refreshes the drawer and everything behind it. */
async function run(request: () => Promise<unknown>, successKey: string) {
  isBusy.value = true
  fieldErrors.value = {}
  try {
    await request()
    await refresh()
    await refreshBookingLists()
    toast.success(t(successKey))
    cancelling.value = false
  }
  catch (error) {
    fieldErrors.value = apiFieldErrors(error)
    toast.error(Object.values(fieldErrors.value)[0] ?? apiErrorMessage(error, t('dashboard.bookingDrawer.errors.action')))
  }
  finally {
    isBusy.value = false
  }
}

const patch = (action: string, body?: Record<string, unknown>) =>
  useApiFetch(`/api/dashboard/bookings/${props.bookingId}/${action}`, { method: 'PATCH', body })

const start = () => run(() => patch('start'), 'dashboard.bookingDrawer.started')
const complete = () => run(() => patch('complete', { extraHours: extraHours.value || 0 }), 'dashboard.bookingDrawer.completed')
const markPaid = () => run(() => patch('payment', { status: 'paid_cash' }), 'dashboard.bookingDrawer.paid')

function confirmCancel() {
  if (!cancelReason.value.trim()) {
    fieldErrors.value = { reason: t('dashboard.bookingDrawer.cancelReasonRequired') }
    return
  }
  return run(() => patch('cancel', { reason: cancelReason.value.trim() }), 'dashboard.bookingDrawer.cancelled')
}

const otherParty = computed(() => (booking.value?.viewerRole === 'provider' ? booking.value.consumer : booking.value?.provider))

async function message() {
  if (!booking.value) return
  isBusy.value = true
  try {
    const conversationId = booking.value.conversationId ?? (await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
      method: 'POST',
      body: booking.value.viewerRole === 'provider'
        ? { consumerUserId: Number(booking.value.consumer.id) }
        : { providerId: Number(booking.value.provider.id) },
    })).id
    emit('close')
    await navigateTo(localePath({ path: '/messages', query: { conversation: conversationId } }))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.bookingDrawer.errors.action')))
  }
  finally {
    isBusy.value = false
  }
}

async function rebook() {
  if (!booking.value) return
  const id = booking.value.id
  emit('close')
  await bookAgain.start(id)
}

function openReviewForm() {
  if (!booking.value) return
  reviewForm.open({
    bookingId: booking.value.id,
    providerName: booking.value.provider.name,
    review: booking.value.review,
  })
}

// --- Provider's public reply to the client's review ---------------------------------------
const replyText = ref('')
const replyError = ref('')
const isReplying = ref(false)

async function sendReply() {
  const review = booking.value?.review
  if (!review) return
  const text = replyText.value.trim()
  if (text.length < 2) {
    replyError.value = t('dashboard.bookingDrawer.reply.tooShort')
    return
  }
  isReplying.value = true
  replyError.value = ''
  try {
    await useApiFetch(`/api/dashboard/reviews/${review.id}/reply`, { method: 'POST', body: { reply: text } })
    replyText.value = ''
    await refresh()
    toast.success(t('dashboard.bookingDrawer.reply.sent'))
  }
  catch (error) {
    replyError.value = Object.values(apiFieldErrors(error))[0] ?? apiErrorMessage(error, t('dashboard.bookingDrawer.reply.failed'))
  }
  finally {
    isReplying.value = false
  }
}

const canBookAgain = computed(() =>
  booking.value?.viewerRole === 'consumer' && (booking.value.status === 'completed' || booking.value.status === 'cancelled'),
)

interface TimelineEntry { key: string, label: string, at: string }

const timeline = computed<TimelineEntry[]>(() => {
  const b = booking.value
  if (!b) return []
  const entries: TimelineEntry[] = [{ key: 'scheduled', label: t('dashboard.bookingDrawer.timeline.scheduled'), at: b.scheduledAt }]
  if (b.startedAt) entries.push({ key: 'started', label: t('dashboard.bookingDrawer.timeline.started'), at: b.startedAt })
  if (b.completedAt) entries.push({ key: 'completed', label: t('dashboard.bookingDrawer.timeline.completed'), at: b.completedAt })
  if (b.cancelledAt) {
    entries.push({
      key: 'cancelled',
      label: t('dashboard.bookingDrawer.timeline.cancelled', { by: b.cancelledBy ? t(`dashboard.bookingDrawer.by.${b.cancelledBy}`) : '' }),
      at: b.cancelledAt,
    })
  }
  if (b.paidAt) entries.push({ key: 'paid', label: t('dashboard.bookingDrawer.timeline.paid'), at: b.paidAt })
  return entries
})
</script>

<template>
  <UiModal
    :open="true"
    :labelledby="titleId"
    @close="emit('close')"
  >
    <div
      v-if="status === 'pending' && !booking"
      class="py-10 text-center text-sm text-black/50 dark:text-white/50"
    >
      {{ t('dashboard.bookingDrawer.loading') }}
    </div>

    <div
      v-else-if="error || !booking"
      class="py-6 text-center"
    >
      <p
        :id="titleId"
        class="text-sm text-black/60 dark:text-white/60"
      >
        {{ t('dashboard.bookingDrawer.notFound') }}
      </p>
      <UiButton
        class="mt-4"
        variant="ghost"
        @click="emit('close')"
      >
        {{ t('dashboard.bookingDrawer.close') }}
      </UiButton>
    </div>

    <div
      v-else
      class="flex max-h-[75vh] flex-col gap-5 overflow-y-auto pr-1"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2
            :id="titleId"
            class="font-display text-xl font-bold"
          >
            {{ booking.service?.title ?? categoryLabel(booking.categoryId, booking.categoryName) }}
          </h2>
          <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
            {{ t(booking.viewerRole === 'provider' ? 'dashboard.bookingDrawer.withClient' : 'dashboard.bookingDrawer.withProvider', { name: otherParty?.name ?? '' }) }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-1.5">
          <DashboardStatusBadge :status="booking.status" />
          <DashboardPaymentBadge
            v-if="booking.status !== 'cancelled'"
            :status="booking.paymentStatus"
          />
        </div>
      </div>

      <dl class="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
        <div>
          <dt class="text-xs font-bold text-black/40 dark:text-white/40">
            {{ t('dashboard.bookingDrawer.when') }}
          </dt>
          <dd class="mt-0.5 font-semibold">
            {{ formatDateTime(booking.scheduledAt, locale) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-bold text-black/40 dark:text-white/40">
            {{ t('dashboard.bookingDrawer.amount') }}
          </dt>
          <dd class="mt-0.5 font-semibold">
            {{ money(booking.amountUsd) }}
            <span
              v-if="booking.hours"
              class="font-normal text-black/50 dark:text-white/50"
            >· {{ t('dashboard.bookingDrawer.hours', { count: booking.hours }) }}</span>
          </dd>
        </div>
        <div
          v-if="booking.address"
          class="col-span-2"
        >
          <dt class="text-xs font-bold text-black/40 dark:text-white/40">
            {{ t('dashboard.bookingDrawer.where') }}
          </dt>
          <dd class="mt-0.5">
            {{ booking.address }}
          </dd>
        </div>
        <div
          v-if="booking.cancellationReason"
          class="col-span-2"
        >
          <dt class="text-xs font-bold text-black/40 dark:text-white/40">
            {{ t('dashboard.bookingDrawer.cancelReason') }}
          </dt>
          <dd class="mt-0.5">
            {{ booking.cancellationReason }}
          </dd>
        </div>
      </dl>

      <ol class="flex flex-col gap-2 border-l-2 border-black/10 pl-4 dark:border-white/10">
        <li
          v-for="entry in timeline"
          :key="entry.key"
          class="text-sm"
        >
          <span class="font-semibold">{{ entry.label }}</span>
          <span class="ml-2 text-xs text-black/50 dark:text-white/50">{{ formatDateTime(entry.at, locale) }}</span>
        </li>
      </ol>

      <div
        v-if="booking.review"
        class="rounded-2xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.06]"
      >
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-black/40 dark:text-white/40">{{ t(booking.viewerRole === 'provider' ? 'dashboard.bookingDrawer.clientReview' : 'dashboard.bookingDrawer.yourReview') }}</span>
          <button
            v-if="booking.review.editable"
            type="button"
            class="text-xs font-semibold underline"
            @click="openReviewForm"
          >
            {{ t('dashboard.bookingDrawer.editReview') }}
          </button>
        </div>
        <UiRating :rating="booking.review.rating" />
        <p
          v-if="booking.review.comment"
          class="mt-1.5 text-black/70 dark:text-white/70"
        >
          {{ booking.review.comment }}
        </p>
        <div
          v-if="booking.review.providerReply"
          class="mt-3 border-l-2 border-brand-600/40 pl-3"
        >
          <p class="text-xs font-bold text-black/40 dark:text-white/40">
            {{ t(booking.viewerRole === 'provider' ? 'dashboard.bookingDrawer.reply.yours' : 'dashboard.bookingDrawer.reply.fromProvider') }}
          </p>
          <p class="mt-0.5 whitespace-pre-line text-black/70 dark:text-white/70">
            {{ booking.review.providerReply }}
          </p>
        </div>
        <form
          v-else-if="booking.review.canReply"
          class="mt-3 flex flex-col gap-2"
          @submit.prevent="sendReply"
        >
          <label
            for="bd-reply"
            class="text-xs font-bold"
          >{{ t('dashboard.bookingDrawer.reply.label') }}</label>
          <textarea
            id="bd-reply"
            v-model="replyText"
            rows="2"
            maxlength="1000"
            :placeholder="t('dashboard.bookingDrawer.reply.placeholder')"
            class="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <p class="text-xs text-black/50 dark:text-white/50">
            {{ t('dashboard.bookingDrawer.reply.help') }}
          </p>
          <p
            v-if="replyError"
            role="alert"
            class="text-xs text-red-600 dark:text-red-400"
          >
            {{ replyError }}
          </p>
          <div class="flex justify-end">
            <UiButton
              type="submit"
              size="sm"
              :disabled="isReplying"
            >
              {{ t('dashboard.bookingDrawer.reply.send') }}
            </UiButton>
          </div>
        </form>
      </div>

      <p
        v-if="booking.startAvailableAt && !booking.can.start"
        class="rounded-xl bg-black/[0.03] px-3.5 py-2.5 text-xs text-black/60 dark:bg-white/[0.06] dark:text-white/60"
      >
        {{ t('dashboard.bookingDrawer.startFrom', { when: formatDateTime(booking.startAvailableAt, locale) }) }}
      </p>

      <div
        v-if="booking.can.complete"
        class="flex items-end gap-3"
      >
        <div class="flex-1">
          <label
            for="bd-extra-hours"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.bookingDrawer.extraHours') }}</label>
          <UiInput
            id="bd-extra-hours"
            :model-value="extraHours ? String(extraHours) : ''"
            inputmode="numeric"
            placeholder="0"
            @update:model-value="(v) => (extraHours = Math.min(24, Number(v.replace(/\D/g, '')) || 0))"
          />
        </div>
        <p class="flex-1 pb-2 text-xs text-black/50 dark:text-white/50">
          {{ t('dashboard.bookingDrawer.extraHoursHelp') }}
        </p>
      </div>

      <div
        v-if="cancelling"
        class="flex flex-col gap-2 rounded-2xl border border-red-200 p-4 dark:border-red-900/50"
      >
        <label
          for="bd-cancel-reason"
          class="text-xs font-bold"
        >{{ t('dashboard.bookingDrawer.cancelReasonLabel') }}</label>
        <textarea
          id="bd-cancel-reason"
          v-model="cancelReason"
          rows="2"
          maxlength="500"
          class="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <p
          v-if="fieldErrors.reason"
          class="text-xs text-red-600 dark:text-red-400"
        >
          {{ fieldErrors.reason }}
        </p>
        <div class="flex justify-end gap-2">
          <UiButton
            variant="ghost"
            size="sm"
            @click="cancelling = false"
          >
            {{ t('dashboard.bookingDrawer.keepBooking') }}
          </UiButton>
          <UiButton
            size="sm"
            class="bg-red-600! text-white! hover:bg-red-700!"
            :disabled="isBusy"
            @click="confirmCancel"
          >
            {{ t('dashboard.bookingDrawer.confirmCancel') }}
          </UiButton>
        </div>
      </div>

      <div class="flex flex-wrap justify-end gap-2">
        <UiButton
          v-if="booking.can.start"
          variant="primary"
          :disabled="isBusy"
          @click="start"
        >
          {{ t('dashboard.bookingDrawer.actions.start') }}
        </UiButton>
        <UiButton
          v-if="booking.can.complete"
          variant="primary"
          :disabled="isBusy"
          @click="complete"
        >
          {{ t('dashboard.bookingDrawer.actions.complete') }}
        </UiButton>
        <UiButton
          v-if="booking.can.markPaid"
          variant="primary"
          :disabled="isBusy"
          @click="markPaid"
        >
          {{ t('dashboard.bookingDrawer.actions.markPaid') }}
        </UiButton>
        <UiButton
          v-if="booking.can.review"
          variant="primary"
          :disabled="isBusy"
          @click="openReviewForm"
        >
          {{ t('dashboard.bookingDrawer.leaveReview') }}
        </UiButton>
        <UiButton
          v-if="canBookAgain"
          variant="secondary"
          :disabled="isBusy"
          @click="rebook"
        >
          {{ t('dashboard.table.bookAgain') }}
        </UiButton>
        <UiButton
          variant="ghost"
          :disabled="isBusy"
          @click="message"
        >
          {{ t('dashboard.table.message') }}
        </UiButton>
        <UiButton
          v-if="booking.can.cancel && !cancelling"
          variant="ghost"
          class="text-red-600! dark:text-red-400!"
          :disabled="isBusy"
          @click="cancelling = true"
        >
          {{ t('dashboard.bookingDrawer.actions.cancel') }}
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>
