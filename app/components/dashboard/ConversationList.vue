<script setup lang="ts">
import type { Conversation } from '#shared/types/dashboard'

// Auto-imported as <DashboardConversationList/>. The left column of the
// messages page — one row per conversation, tagged Client or Provider so
// it's obvious at a glance which side of a booking each thread is on.
// Swiping a row archives it (or, in the archived view, restores it).
const props = defineProps<{
  conversations: Conversation[]
  activeId: string
  /** Showing archived threads: the swipe action becomes "Unarchive". */
  archivedView?: boolean
  /** The list is empty because of a search, not because there are no conversations. */
  searching?: boolean
}>()

defineEmits<{
  select: [id: string]
  archive: [id: string]
  unarchive: [id: string]
}>()

const { t } = useI18n()

function timeLabel(hours: number) {
  return hours < 24
    ? t('dashboard.messages.hoursAgo', { count: hours })
    : t('dashboard.messages.daysAgo', { count: Math.round(hours / 24) })
}

// The server sends the newest message's text only for plain messages; the
// rest are worded here so they translate.
function previewOf(conversation: Conversation) {
  switch (conversation.lastMessageType) {
    case 'quote': return t('dashboard.messages.preview.quote')
    case 'attachment': return t('dashboard.messages.preview.attachment')
    case 'system': return t('dashboard.messages.preview.system')
    default: return conversation.lastMessagePreview
  }
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
      :action-label="archivedView ? t('dashboard.messages.unarchive') : t('dashboard.messages.archive')"
      :action-icon="archivedView ? 'check' : 'x'"
      @action="archivedView ? $emit('unarchive', conversation.id) : $emit('archive', conversation.id)"
    >
      <button
        type="button"
        :class="rowClass(conversation)"
        @click="$emit('select', conversation.id)"
      >
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          :class="avatarClass(index)"
        >
          {{ initialsFor(conversation.personName) }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5">
            <span
              class="truncate text-sm"
              :class="conversation.unread ? 'font-extrabold' : 'font-bold'"
            >{{ conversation.personName }}</span>
            <UiTag
              :variant="conversation.role === 'client' ? 'primary' : 'accent'"
              size="sm"
            >
              {{ conversation.role === 'client' ? t('dashboard.messages.roleClient') : t('dashboard.messages.roleProvider') }}
            </UiTag>
          </span>
          <span
            class="block truncate text-xs"
            :class="conversation.unread ? 'font-semibold text-black dark:text-white' : 'text-black/60 dark:text-white/60'"
          >{{ previewOf(conversation) }}</span>
        </span>
        <span class="flex shrink-0 flex-col items-end gap-1.5">
          <span class="text-[11px] text-black/40 dark:text-white/40">{{ timeLabel(conversation.timeAgoHours) }}</span>
          <span
            v-if="conversation.unreadCount > 0"
            class="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-[11px] font-bold text-white"
            :aria-label="t('dashboard.messages.unreadCount', { count: conversation.unreadCount }, conversation.unreadCount)"
          >{{ formatBadgeCount(conversation.unreadCount) }}</span>
        </span>
      </button>
    </UiSwipeAction>

    <p
      v-if="conversations.length === 0"
      class="px-3 py-8 text-center text-sm text-black/50 dark:text-white/50"
    >
      {{ searching ? t('dashboard.messages.noResults') : archivedView ? t('dashboard.messages.emptyArchived') : t('dashboard.messages.emptyInbox') }}
    </p>
  </div>
</template>
