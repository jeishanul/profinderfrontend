<script setup lang="ts">
import type { NotificationItem } from '#shared/types/dashboard'

// Auto-imported as <DashboardNotificationRow/>. One row in the notifications
// feed — icon, translated title/body, and an unread highlight. Clicking an
// unread row marks it read (`markRead` on the backend, via the parent page).
const props = defineProps<{
  item: NotificationItem
}>()

defineEmits<{
  read: [id: string]
}>()

const { t } = useI18n()

const ICON_BY_KIND: Record<NotificationItem['kind'], IconName> = {
  new_booking: 'briefcase',
  payment_received: 'wallet',
  new_message: 'message',
  review_received: 'star',
  order_completed: 'check-circle',
  kyc_submitted: 'shield-check',
  refund_processed: 'wallet',
  booking_reminder: 'calendar',
}

const TINT_BY_KIND: Record<NotificationItem['kind'], string> = {
  new_booking: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  payment_received: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  new_message: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
  review_received: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  order_completed: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
  kyc_submitted: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  refund_processed: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  booking_reminder: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
}

const title = computed(() => t(`dashboard.notificationsPage.${props.item.kind}.title`, {
  name: props.item.personName ?? '',
  rating: props.item.ratingGiven ?? '',
}))

const body = computed(() => t(`dashboard.notificationsPage.${props.item.kind}.body`, {
  name: props.item.personName ?? '',
  category: props.item.categoryId ? t(`marketplace.categories.${props.item.categoryId}.label`) : '',
  amount: props.item.amountUsd ?? 0,
}))

const timeLabel = computed(() => props.item.timeAgoHours < 24
  ? t('dashboard.notificationsPage.hoursAgo', { count: props.item.timeAgoHours })
  : t('dashboard.notificationsPage.daysAgo', { count: Math.round(props.item.timeAgoHours / 24) }))
</script>

<template>
  <UiSwipeAction
    class="mb-1.5 last:mb-0"
    :action-label="t('dashboard.notificationsPage.markRead')"
    action-icon="check"
    @action="$emit('read', item.id)"
  >
    <div
      class="flex gap-3.5 rounded-xl px-2 py-3.5"
      :class="!item.read && 'bg-brand-50 dark:bg-brand-700/10'"
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
    </div>
  </UiSwipeAction>
</template>
