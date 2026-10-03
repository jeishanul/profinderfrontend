<script setup lang="ts">
import type { ActivityItem } from '#shared/types/dashboard'

// Auto-imported as <DashboardActivityFeed/>. Renders the role-specific
// recent-activity list on the dashboard overview.
const props = defineProps<{
  items: ActivityItem[]
}>()

const { t } = useI18n()
const { money } = useSiteSettings()
const categoryLabel = useCategoryLabel()
// `resolveComponent` so Nuxt can resolve the auto-imported link in a dynamic `:is`.
const NuxtLinkLocale = resolveComponent('NuxtLinkLocale')

const ICON_BY_KIND: Record<ActivityItem['kind'], IconName> = {
  new_booking: 'briefcase',
  payment_received: 'wallet',
  review_received: 'star',
  new_message: 'message',
  order_completed: 'check-circle',
  refund_processed: 'wallet',
  new_order: 'bag',
}

function iconFor(item: ActivityItem) {
  return ICON_BY_KIND[item.kind]
}

function textFor(item: ActivityItem) {
  return t(`dashboard.overview.activity.${item.kind}`, {
    name: item.personName,
    category: categoryLabel(item.categoryId),
    amount: money(item.amountUsd ?? 0),
    rating: item.ratingGiven ?? 0,
  })
}

function timeFor(item: ActivityItem) {
  return item.timeAgoHours < 24
    ? t('dashboard.overview.activity.hoursAgo', { count: item.timeAgoHours })
    : t('dashboard.overview.activity.daysAgo', { count: Math.round(item.timeAgoHours / 24) })
}

const rows = computed(() => props.items)
</script>

<template>
  <p
    v-if="rows.length === 0"
    class="py-6 text-center text-sm text-black/50 dark:text-white/50"
  >
    {{ t('dashboard.overview.activity.empty') }}
  </p>
  <ul
    v-else
    class="flex flex-col"
  >
    <li
      v-for="(item, index) in rows"
      :key="item.id"
      :class="index < rows.length - 1 && 'border-b border-black/10 dark:border-white/10'"
    >
      <component
        :is="item.link ? NuxtLinkLocale : 'div'"
        :to="item.link ?? undefined"
        class="flex items-center gap-3.5 py-3"
        :class="item.link && 'rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
          <UiIcon
            :name="iconFor(item)"
            :size="16"
          />
        </span>
        <span class="min-w-0 flex-1 text-sm font-semibold">
          {{ textFor(item) }}
        </span>
        <span class="shrink-0 text-xs text-black/40 dark:text-white/40">
          {{ timeFor(item) }}
        </span>
      </component>
    </li>
  </ul>
</template>
