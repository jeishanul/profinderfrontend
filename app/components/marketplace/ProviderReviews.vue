<script setup lang="ts">
import type { PagedResult, Review } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceProviderReviews/>. A provider page's review
// section: the star histogram, the newest reviews, "show more" (pages the
// public reviews endpoint) and a Report link per review.
const props = defineProps<{
  providerId: string
  rating: number
  total: number
  breakdown: { stars: number, count: number }[]
  initialReviews: Review[]
}>()

const { t, locale } = useI18n()
const toast = useToast()
const session = useSession()
const authModal = useAuthModal()

const PAGE_SIZE = 5
const reviews = ref<Review[]>([...props.initialReviews])
const page = ref(1)
const isLoading = ref(false)
const hasMore = computed(() => reviews.value.length < props.total)

async function loadMore() {
  isLoading.value = true
  try {
    const result = await useApiFetch<PagedResult<Review>>(`/api/providers/${props.providerId}/reviews`, {
      query: { page: page.value + 1, perPage: PAGE_SIZE },
    })
    const known = new Set(reviews.value.map(review => review.id))
    reviews.value = [...reviews.value, ...result.items.filter(review => !known.has(review.id))]
    page.value += 1
  }
  catch {
    toast.error(t('marketplace.providerProfile.reviewsFailed'))
  }
  finally {
    isLoading.value = false
  }
}

const maxCount = computed(() => Math.max(1, ...props.breakdown.map(row => row.count)))

const reportTarget = ref<string | null>(null)
function report(reviewId: string) {
  if (!session.isAuthenticated.value) {
    authModal.open('login', { onSuccess: () => report(reviewId) })
    return
  }
  reportTarget.value = reviewId
}

// --- The reviewed provider's own, one-time public reply ---------------------------------
// Keyed by review id — in principle more than one of the provider's own reviews can be
// awaiting a reply at once, so each needs its own draft/error/submitting state.
const replyDrafts = reactive<Record<string, string>>({})
const replyErrors = reactive<Record<string, string>>({})
const isReplying = ref<string | null>(null)

async function sendReply(reviewId: string) {
  const text = (replyDrafts[reviewId] ?? '').trim()
  if (text.length < 2) {
    replyErrors[reviewId] = t('dashboard.bookingDrawer.reply.tooShort')
    return
  }
  isReplying.value = reviewId
  replyErrors[reviewId] = ''
  try {
    const updated = await useApiFetch<{ providerReply: string | null }>(`/api/dashboard/reviews/${reviewId}/reply`, { method: 'POST', body: { reply: text } })
    // `providerReply` becomes non-null, so the `v-if` above this form takes over —
    // no need to also flip `canReply`, the reply form just stops rendering for this row.
    const target = reviews.value.find(review => review.id === reviewId)
    if (target) target.providerReply = updated.providerReply
    replyDrafts[reviewId] = ''
    toast.success(t('dashboard.bookingDrawer.reply.sent'))
  }
  catch (error) {
    replyErrors[reviewId] = Object.values(apiFieldErrors(error))[0] ?? apiErrorMessage(error, t('dashboard.bookingDrawer.reply.failed'))
  }
  finally {
    isReplying.value = null
  }
}
</script>

<template>
  <div>
    <div class="mb-3.5 flex items-center justify-between">
      <h2 class="text-lg font-bold">
        {{ t('marketplace.providerProfile.reviews', { count: total }) }}
      </h2>
    </div>

    <div
      v-if="total > 0"
      class="mb-5 grid grid-cols-1 gap-5 rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-xl sm:grid-cols-[140px_1fr] dark:border-white/10 dark:bg-black/30"
    >
      <div class="flex flex-col items-center justify-center gap-1">
        <span class="font-display text-4xl font-bold">{{ rating.toFixed(1) }}</span>
        <UiIcon
          name="star"
          filled
          :size="22"
          class="text-accent-600"
        />
      </div>
      <ul
        class="flex flex-col gap-1.5"
        :aria-label="t('marketplace.providerProfile.ratingBreakdown')"
      >
        <li
          v-for="row in breakdown"
          :key="row.stars"
          class="flex items-center gap-2.5 text-xs"
        >
          <span class="w-12 shrink-0 text-black/60 dark:text-white/60">{{ t('marketplace.providerProfile.starsLabel', { stars: row.stars }) }}</span>
          <span class="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <span
              class="block h-full rounded-full bg-accent-600"
              :style="{ width: `${(row.count / maxCount) * 100}%` }"
            />
          </span>
          <span class="w-6 shrink-0 text-right tabular-nums text-black/60 dark:text-white/60">{{ row.count }}</span>
        </li>
      </ul>
    </div>

    <p
      v-if="reviews.length === 0"
      class="text-sm text-black/50 dark:text-white/50"
    >
      {{ t('marketplace.providerProfile.noReviewsYet') }}
    </p>

    <div class="flex flex-col gap-3.5">
      <article
        v-for="review in reviews"
        :key="review.id"
        class="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/30"
      >
        <div class="flex items-center gap-2.5">
          <UiAvatar
            :name="review.reviewerName"
            :src="review.reviewerAvatarUrl"
            size-class="h-9 w-9 rounded-full"
          />
          <div>
            <p class="text-sm font-bold">
              {{ review.reviewerName }}
            </p>
            <div
              class="flex gap-0.5"
              role="img"
              :aria-label="t('ui.starInput.stars', { count: review.rating }, review.rating)"
            >
              <UiIcon
                v-for="n in review.rating"
                :key="n"
                name="star"
                filled
                :size="16"
                class="text-accent-600"
              />
            </div>
          </div>
          <span class="ml-auto text-xs text-black/40 dark:text-white/40">
            {{ formatRelativeDate(review.postedAt, locale) }}
          </span>
        </div>
        <p
          v-if="review.comment"
          class="mt-3 text-sm text-black/60 dark:text-white/60"
        >
          {{ review.comment }}
        </p>
        <div
          v-if="review.providerReply"
          class="mt-3 rounded-xl bg-black/[0.04] px-3.5 py-2.5 text-sm dark:bg-white/[0.06]"
        >
          <p class="mb-0.5 text-xs font-bold text-black/50 dark:text-white/50">
            {{ t('marketplace.providerProfile.providerReply') }}
          </p>
          {{ review.providerReply }}
        </div>
        <form
          v-else-if="review.canReply"
          class="mt-3 flex flex-col gap-2"
          @submit.prevent="sendReply(review.id)"
        >
          <label
            :for="`review-reply-${review.id}`"
            class="text-xs font-bold"
          >{{ t('dashboard.bookingDrawer.reply.label') }}</label>
          <textarea
            :id="`review-reply-${review.id}`"
            v-model="replyDrafts[review.id]"
            rows="2"
            maxlength="1000"
            :placeholder="t('dashboard.bookingDrawer.reply.placeholder')"
            class="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <p class="text-xs text-black/50 dark:text-white/50">
            {{ t('dashboard.bookingDrawer.reply.help') }}
          </p>
          <p
            v-if="replyErrors[review.id]"
            class="text-xs text-red-600 dark:text-red-400"
          >
            {{ replyErrors[review.id] }}
          </p>
          <UiButton
            type="submit"
            size="sm"
            class="self-start"
            :disabled="isReplying === review.id"
          >
            {{ t('dashboard.bookingDrawer.reply.send') }}
          </UiButton>
        </form>
        <button
          type="button"
          class="mt-3 text-xs text-black/40 underline hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
          @click="report(review.id)"
        >
          {{ t('marketplace.providerProfile.reportReview') }}
        </button>
      </article>
    </div>

    <div
      v-if="hasMore"
      class="mt-4 flex justify-center"
    >
      <UiButton
        variant="ghost"
        :disabled="isLoading"
        @click="loadMore"
      >
        {{ isLoading ? t('marketplace.providerProfile.loadingReviews') : t('marketplace.providerProfile.loadMoreReviews') }}
      </UiButton>
    </div>

    <MarketplaceReportModal
      :open="reportTarget !== null"
      type="review"
      :target-id="reportTarget ?? ''"
      @close="reportTarget = null"
    />
  </div>
</template>
