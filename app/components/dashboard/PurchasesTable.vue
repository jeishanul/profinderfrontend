<script setup lang="ts">
import type { PurchaseRecord } from '#shared/types/dashboard'

// Auto-imported as <DashboardPurchasesTable/>. Used both on the dashboard
// overview (a 3-row preview) and the full my-purchases page. "Details" opens
// the shared booking drawer, where a client can cancel or message; "Book
// again" starts a pre-filled request to the same provider.
const props = withDefaults(
  defineProps<{
    purchases: PurchaseRecord[]
    limit?: number
  }>(),
  { limit: undefined },
)

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const categoryLabel = useCategoryLabel()
const localePath = useLocalePath()
const toast = useToast()
const drawer = useBookingDrawer()
const bookAgain = useBookAgain()
const reviewForm = useReviewForm()

const rows = computed(() => (props.limit ? props.purchases.slice(0, props.limit) : props.purchases))

const AVATAR_TINTS = [
  'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
]

function avatarClass(index: number) {
  return AVATAR_TINTS[index % AVATAR_TINTS.length]
}

const canCancel = (purchase: PurchaseRecord) => purchase.can.cancel
const canEditReview = (purchase: PurchaseRecord) => purchase.hasReview && purchase.reviewEditable
const openReview = (purchase: PurchaseRecord) => reviewForm.open({ bookingId: purchase.id, providerName: purchase.providerName })
const canBookAgain = (purchase: PurchaseRecord) => purchase.status === 'completed' || purchase.status === 'cancelled'
const serviceLabel = (purchase: PurchaseRecord) => purchase.serviceTitle ?? categoryLabel(purchase.categoryId, purchase.categoryName)

// "Message" opens the thread this booking came from, or finds/creates one.
const messagingId = ref<string | null>(null)
async function messageProvider(purchase: PurchaseRecord) {
  if (messagingId.value) return
  messagingId.value = purchase.id
  try {
    const conversationId = purchase.conversationId ?? (await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
      method: 'POST',
      body: { providerId: Number(purchase.providerId) },
    })).id
    await navigateTo(localePath({ path: '/messages', query: { conversation: conversationId } }))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.table.messageFailed')))
  }
  finally {
    messagingId.value = null
  }
}
</script>

<template>
  <div>
    <!-- Below `sm`, a table can only ever be a horizontally-scrolling strip
         of cut-off columns — not a native-feeling list — so it becomes real
         stacked cards instead (see CLAUDE.md's mobile-first redesign notes);
         the table below (`hidden sm:block`) takes over from `sm` up. -->
    <div class="flex flex-col gap-3 sm:hidden">
      <div
        v-for="(purchase, index) in rows"
        :key="purchase.id"
        class="rounded-2xl border border-black/10 p-4 dark:border-white/10"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 font-semibold">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              :class="avatarClass(index)"
            >
              {{ initialsFor(purchase.providerName) }}
            </span>
            <div>
              <div>{{ purchase.providerName }}</div>
              <div class="mt-0.5 text-xs font-normal text-black/60 dark:text-white/60">
                {{ serviceLabel(purchase) }} &middot; {{ formatDateTime(purchase.scheduledAt, locale) }}
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <DashboardStatusBadge :status="purchase.status" />
            <DashboardPaymentBadge
              v-if="purchase.status !== 'cancelled'"
              :status="purchase.paymentStatus"
            />
          </div>
        </div>
        <div class="mt-2 text-sm font-semibold">
          {{ money(purchase.amountUsd) }}
        </div>
        <div class="mt-3.5 flex gap-2">
          <UiButton
            v-if="purchase.can.review"
            variant="primary"
            size="sm"
            class="flex-1 justify-center"
            @click="openReview(purchase)"
          >
            {{ t('dashboard.table.review') }}
          </UiButton>
          <UiButton
            v-if="canEditReview(purchase)"
            variant="secondary"
            size="sm"
            class="flex-1 justify-center"
            @click="drawer.open(purchase.id)"
          >
            {{ t('dashboard.table.editReview') }}
          </UiButton>
          <UiButton
            variant="secondary"
            size="sm"
            class="flex-1 justify-center"
            @click="drawer.open(purchase.id)"
          >
            {{ t('dashboard.table.details') }}
          </UiButton>
          <UiButton
            variant="ghost"
            size="sm"
            class="flex-1 justify-center"
            :disabled="messagingId === purchase.id"
            @click="messageProvider(purchase)"
          >
            {{ t('dashboard.table.message') }}
          </UiButton>
          <UiButton
            v-if="canBookAgain(purchase)"
            variant="ghost"
            size="sm"
            class="flex-1 justify-center"
            :disabled="bookAgain.isStarting.value"
            @click="bookAgain.start(purchase.id)"
          >
            {{ t('dashboard.table.bookAgain') }}
          </UiButton>
          <UiButton
            v-if="canCancel(purchase)"
            variant="ghost"
            size="sm"
            class="flex-1 justify-center text-red-600! dark:text-red-400!"
            @click="drawer.open(purchase.id, { cancel: true })"
          >
            {{ t('dashboard.table.cancel') }}
          </UiButton>
        </div>
      </div>
    </div>

    <div class="hidden overflow-x-auto sm:block">
      <table class="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-black/10 text-left text-xs font-bold tracking-wide text-black/40 uppercase dark:border-white/10 dark:text-white/40">
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.provider') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.service') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.date') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.amount') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.status') }}
            </th>
            <th class="pb-3 font-bold">
              <span class="sr-only">{{ t('dashboard.table.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(purchase, index) in rows"
            :key="purchase.id"
            class="border-b border-black/10 last:border-0 dark:border-white/10"
          >
            <td class="py-3.5 pr-3">
              <div class="flex items-center gap-2.5 font-semibold">
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  :class="avatarClass(index)"
                >
                  {{ initialsFor(purchase.providerName) }}
                </span>
                {{ purchase.providerName }}
              </div>
            </td>
            <td class="py-3.5 pr-3 text-black/60 dark:text-white/60">
              {{ serviceLabel(purchase) }}
            </td>
            <td class="py-3.5 pr-3 text-black/60 dark:text-white/60">
              {{ formatDateTime(purchase.scheduledAt, locale) }}
            </td>
            <td class="py-3.5 pr-3 font-semibold">
              {{ money(purchase.amountUsd) }}
            </td>
            <td class="py-3.5 pr-3">
              <div class="flex flex-wrap items-center gap-1.5">
                <DashboardStatusBadge :status="purchase.status" />
                <DashboardPaymentBadge
                  v-if="purchase.status !== 'cancelled'"
                  :status="purchase.paymentStatus"
                />
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex justify-end gap-2">
                <UiButton
                  v-if="purchase.can.review"
                  variant="primary"
                  size="sm"
                  @click="openReview(purchase)"
                >
                  {{ t('dashboard.table.review') }}
                </UiButton>
                <UiButton
                  v-if="canEditReview(purchase)"
                  variant="secondary"
                  size="sm"
                  @click="drawer.open(purchase.id)"
                >
                  {{ t('dashboard.table.editReview') }}
                </UiButton>
                <UiButton
                  variant="secondary"
                  size="sm"
                  @click="drawer.open(purchase.id)"
                >
                  {{ t('dashboard.table.details') }}
                </UiButton>
                <UiButton
                  variant="ghost"
                  size="sm"
                  :disabled="messagingId === purchase.id"
                  @click="messageProvider(purchase)"
                >
                  {{ t('dashboard.table.message') }}
                </UiButton>
                <UiButton
                  v-if="canBookAgain(purchase)"
                  variant="ghost"
                  size="sm"
                  :disabled="bookAgain.isStarting.value"
                  @click="bookAgain.start(purchase.id)"
                >
                  {{ t('dashboard.table.bookAgain') }}
                </UiButton>
                <UiButton
                  v-if="canCancel(purchase)"
                  variant="ghost"
                  size="sm"
                  class="text-red-600! dark:text-red-400!"
                  @click="drawer.open(purchase.id, { cancel: true })"
                >
                  {{ t('dashboard.table.cancel') }}
                </UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p
      v-if="rows.length === 0"
      class="py-8 text-center text-sm text-black/50 dark:text-white/50"
    >
      {{ t('dashboard.purchases.empty') }}
    </p>
  </div>
</template>
