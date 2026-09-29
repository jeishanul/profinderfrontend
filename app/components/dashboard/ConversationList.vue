<script setup lang="ts">
import type { Conversation } from '#shared/types/dashboard'

// Auto-imported as <DashboardConversationList/>. The left column of the
// messages page — one row per conversation, tagged Client or Provider so
// it's obvious at a glance which side of a booking each thread is on.
const props = defineProps<{
  conversations: Conversation[]
  activeId: string
}>()

defineEmits<{
  select: [id: string]
  archive: [id: string]
}>()

const { t } = useI18n()

function timeLabel(hours: number) {
  return hours < 24
    ? t('dashboard.messages.hoursAgo', { count: hours })
    : t('dashboard.messages.daysAgo', { count: Math.round(hours / 24) })
}

const AVATAR_TINTS = [
  'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
]

function avatarClass(index: number) {
  return AVATAR_TINTS[index % AVATAR_TINTS.length]
}

function rowClass(conversation: Conversation) {
  return [
    'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
    conversation.id === props.activeId
      ? 'bg-brand-50 dark:bg-brand-700/20'
      : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.06]',
  ]
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <UiSwipeAction
      v-for="(conversation, index) in conversations"
      :key="conversation.id"
      :action-label="t('dashboard.messages.archive')"
      action-icon="trash"
      @action="$emit('archive', conversation.id)"
    >
      <button
        type="button"
        :class="rowClass(conversation)"
        @click="$emit('select', conversation.id)"
      >
        <span class="relative shrink-0">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
            :class="avatarClass(index)"
          >
            {{ initialsFor(conversation.personName) }}
          </span>
          <span
            v-if="conversation.online"
            class="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white dark:ring-black"
          />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5">
            <span class="truncate text-sm font-bold">{{ conversation.personName }}</span>
            <UiTag
              :variant="conversation.role === 'client' ? 'primary' : 'accent'"
              size="sm"
            >
              {{ conversation.role === 'client' ? t('dashboard.messages.roleClient') : t('dashboard.messages.roleProvider') }}
            </UiTag>
          </span>
          <span class="block truncate text-xs text-black/60 dark:text-white/60">{{ conversation.lastMessagePreview }}</span>
        </span>
        <span class="flex shrink-0 flex-col items-end gap-1.5">
          <span class="text-[11px] text-black/40 dark:text-white/40">{{ timeLabel(conversation.timeAgoHours) }}</span>
          <span
            v-if="conversation.unread"
            class="h-2 w-2 rounded-full bg-accent-600"
          />
        </span>
      </button>
    </UiSwipeAction>
  </div>
</template>
