<script setup lang="ts">
import type { NotificationItem } from '#shared/types/dashboard'

// Auto-imported as <DashboardNotificationRow/>. One row in the notifications
// feed — icon, translated title/body, and an unread highlight. Clicking an
// unread row marks it read (`markRead` on the backend, via the parent page).
const props = defineProps<{
  item: NotificationItem
}>()

const emit = defineEmits<{
  read: [id: string]
  remove: [id: string]
}>()

const { t } = useI18n()
const { money } = useSiteSettings()
const categoryLabel = useCategoryLabel()
// `resolveComponent` (not a bare string in `:is`) so Nuxt can actually resolve the auto-imported link component.
const NuxtLinkLocale = resolveComponent('NuxtLinkLocale')

const ICON_BY_KIND: Record<NotificationItem['kind'], IconName> = {
  new_booking: 'briefcase',
  payment_received: 'wallet',
  new_message: 'message',
  job_request: 'briefcase',
  review_received: 'star',
  order_completed: 'check-circle',
  kyc_submitted: 'shield-check',
  refund_processed: 'wallet',
  booking_reminder: 'calendar',
  quote_received: 'briefcase',
  quote_declined: 'briefcase',
  booking_started: 'calendar',
  booking_cancelled: 'x',
  kyc_approved: 'shield-check',
  kyc_rejected: 'shield-check',
  provider_verified: 'shield-check',
  provider_unverified: 'shield-check',
  account_suspended: 'lock',
  account_reactivated: 'check-circle',
  review_hidden: 'star',
  announcement: 'bell',
  admin_notice: 'shield-check',
  booking_updated: 'calendar',
  listing_paused: 'briefcase',
  listing_removed: 'briefcase',
  provider_profile_removed: 'lock',
  provider_profile_restored: 'check-circle',
  report_resolved: 'shield-check',
  report_dismissed: 'shield-check',
}

// Good news is brand green, money is amber, problems are red, everything else neutral.
const TINT = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  accent: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  neutral: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
}

const TINT_BY_KIND: Record<NotificationItem['kind'], string> = {
  new_booking: TINT.brand,
  payment_received: TINT.accent,
  new_message: TINT.neutral,
  job_request: TINT.accent,
  review_received: TINT.brand,
  order_completed: TINT.neutral,
  kyc_submitted: TINT.danger,
  refund_processed: TINT.accent,
  booking_reminder: TINT.neutral,
  quote_received: TINT.accent,
  quote_declined: TINT.neutral,
  booking_started: TINT.brand,
  booking_cancelled: TINT.danger,
  kyc_approved: TINT.brand,
  kyc_rejected: TINT.danger,
  provider_verified: TINT.brand,
  provider_unverified: TINT.danger,
  account_suspended: TINT.danger,
  account_reactivated: TINT.brand,
  review_hidden: TINT.danger,
  announcement: TINT.brand,
  admin_notice: TINT.accent,
  booking_updated: TINT.accent,
  listing_paused: TINT.danger,
  listing_removed: TINT.danger,
  provider_profile_removed: TINT.danger,
  provider_profile_restored: TINT.brand,
  report_resolved: TINT.brand,
  report_dismissed: TINT.neutral,
}

// Copy the server wrote itself (announcements, account notices, a cancellation
// reason) wins; every other notification is a translated template for its kind.
const params = computed(() => ({
  name: props.item.personName ?? '',
  rating: props.item.ratingGiven ?? '',
  category: categoryLabel(props.item.categoryId),
  amount: money(props.item.amountUsd ?? 0),
}))

const title = computed(() => props.item.title || t(`dashboard.notificationsPage.${props.item.kind}.title`, params.value))
const body = computed(() => props.item.body || t(`dashboard.notificationsPage.${props.item.kind}.body`, params.value))

const timeLabel = computed(() => props.item.timeAgoHours < 24
  ? t('dashboard.notificationsPage.hoursAgo', { count: props.item.timeAgoHours })
  : t('dashboard.notificationsPage.daysAgo', { count: Math.round(props.item.timeAgoHours / 24) }))

function onOpen() {
  if (!props.item.read) emit('read', props.item.id)
}
</script>

<template>
  <UiSwipeAction
    class="mb-1.5 last:mb-0"
    :action-label="t('dashboard.notificationsPage.markRead')"
    action-icon="check"
    @action="$emit('read', item.id)"
  >
    <div class="relative">
      <component
        :is="item.link ? NuxtLinkLocale : 'div'"
        :to="item.link ?? undefined"
        class="flex gap-3.5 rounded-xl px-2 py-3.5"
        :class="!item.read && 'bg-brand-50 dark:bg-brand-700/10'"
        @click="item.link && onOpen()"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          :class="TINT_BY_KIND[item.kind]"
        >
          <UiIcon
            :name="ICON_BY_KIND[item.kind]"
            :size="16"
          />
        </span>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-bold">
            {{ title }}
          </div>
          <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
            {{ body }}
          </div>
        </div>
        <div class="shrink-0 text-xs whitespace-nowrap text-black/40 dark:text-white/40">
          {{ timeLabel }}
        </div>
      </component>
      <button
        type="button"
        class="absolute right-2 bottom-2 hidden rounded-full p-1.5 text-black/30 hover:bg-black/5 hover:text-red-600 sm:block dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-red-400"
        :aria-label="t('dashboard.notificationsPage.remove')"
        @click.stop.prevent="emit('remove', item.id)"
      >
        <UiIcon
          name="trash"
          :size="14"
        />
      </button>
    </div>
  </UiSwipeAction>
</template>
