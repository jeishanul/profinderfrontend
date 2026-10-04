<script setup lang="ts">
import type { AttachmentType, Conversation, ConversationMessage, MessageAttachment, MessageMeta, Quote, QuotePayload, ServiceListing } from '#shared/types/dashboard'

// Auto-imported as <DashboardMessageThread/>. The right-hand panel of the
// messages page: header (presence), the bubble list (attachments + status
// ticks + per-message delete), and a WhatsApp-style composer (emoji,
// attach-menu, auto-growing textarea). Sending/deleting/quoting all call the
// real API now (see `messages.vue`) — this component still only emits, the
// parent page owns the actual API calls and the message list.
const props = defineProps<{
  conversation: Conversation
  messages: ConversationMessage[]
  /** The provider's listings, offered as an optional tag on a quote. */
  services?: ServiceListing[]
  /** Whether the viewer (as provider) is identity-verified; `false` = quotes are refused, so don't offer the form. */
  providerVerified?: boolean
  /** The quote an action is currently running on (disables its buttons). */
  busyQuoteId?: string | null
  /** True while the quote form's request is in flight. */
  quoteSubmitting?: boolean
  /** Server validation errors for the quote form, by field. */
  quoteErrors?: Record<string, string>
  /** Older messages exist beyond what's loaded. */
  hasMoreBefore?: boolean
  loadingOlder?: boolean
  /** The first page of the thread is still loading. */
  loading?: boolean
  /** A message is being sent — the composer keeps its text until it succeeds. */
  sending?: boolean
  /** Why the last send failed; shown above the composer. */
  sendError?: string
}>()

const emit = defineEmits<{
  'send': [payload: { text: string, file: File | null, attachmentType: AttachmentType | null }]
  'delete': [messageId: string]
  'send-quote': [payload: QuotePayload]
  'edit-quote': [quoteId: string, payload: QuotePayload]
  'withdraw-quote': [quoteId: string]
  'accept-quote': [quote: Quote]
  'decline-quote': [quoteId: string]
  'view-booking': [bookingId: string]
  'load-older': []
  /** Mobile-only back button (see `messages.vue`'s list/thread split) — a
   * no-op on desktop, where nothing listens for it since the list stays
   * visible alongside the thread there. */
  'back': []
}>()

// A quote only makes sense flowing provider -> client (see
// `DashboardQuoteFormModal`'s doc comment) — `conversation.role === 'client'`
// means the account is acting as the provider in this thread.
const isProviderHere = computed(() => props.conversation.role === 'client')
const canSendQuote = computed(() => isProviderHere.value && props.providerVerified !== false)
// A provider who isn't verified yet is pointed at verification instead of a form the server would refuse.
const needsVerificationToQuote = computed(() => isProviderHere.value && props.providerVerified === false)
const showQuoteForm = ref(false)
// Set while editing a pending quote; `null` means the form creates a new one.
const editingQuote = ref<Quote | null>(null)

// The client's most recent job request, offered to the provider as the
// starting point of their quote (date, address and service pre-filled).
const latestJobRequest = computed(() =>
  [...props.messages].reverse().find(message => message.meta?.type === 'job_request' && !message.fromMe)?.meta ?? null,
)

// The job request the open form starts from: the one a card's own button was pressed on, else the newest.
const quotePrefill = ref<MessageMeta | null>(null)

function openNewQuote(fromRequest: MessageMeta | null = null) {
  editingQuote.value = null
  quotePrefill.value = fromRequest ?? latestJobRequest.value
  showQuoteForm.value = true
}

function openEditQuote(quote: Quote) {
  editingQuote.value = quote
  showQuoteForm.value = true
}

const { t, locale } = useI18n()
const { settings } = useSiteSettings()
const siteName = computed(() => settings.value.siteName ?? t('brand.name'))
const categoryLabel = useCategoryLabel()

const draft = ref('')
const pendingAttachment = ref<MessageAttachment | null>(null)
const pendingFile = ref<File | null>(null)
const showAttachMenu = ref(false)
const showEmojiPicker = ref(false)

const textareaRef = ref<HTMLTextAreaElement>()
const imageInputRef = ref<HTMLInputElement>()
const documentInputRef = ref<HTMLInputElement>()
const attachMenuRoot = ref<HTMLElement>()
const emojiPickerRoot = ref<HTMLElement>()
const messageListRef = ref<HTMLElement>()

onClickOutside(attachMenuRoot, () => {
  showAttachMenu.value = false
})
onClickOutside(emojiPickerRoot, () => {
  showEmojiPicker.value = false
})

function scrollToBottom() {
  const el = messageListRef.value
  if (el) el.scrollTop = el.scrollHeight
}

onMounted(scrollToBottom)

// A new message follows the conversation only if you were already at the
// bottom (or it's your own) — a polled-in message must not yank you away from
// older ones you're reading. Prepending older messages keeps your place.
const NEAR_BOTTOM_PX = 120
watch(() => props.messages, (next, previous) => {
  const el = messageListRef.value
  if (!el) return
  const previousHeight = el.scrollHeight
  const wasNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
  const prependedOlder = previous.length > 0 && next.length > previous.length && next[0]?.id !== previous[0]?.id
  const addedMine = next.length > previous.length && next.at(-1)?.fromMe === true

  nextTick(() => {
    if (prependedOlder) el.scrollTop += el.scrollHeight - previousHeight
    else if (wasNearBottom || addedMine) scrollToBottom()
  })
})

watch(() => props.conversation.id, () => {
  draft.value = ''
  clearPendingAttachment()
  showAttachMenu.value = false
  showEmojiPicker.value = false
  showQuoteForm.value = false
  nextTick(scrollToBottom)
})

function handleQuoteSubmit(payload: QuotePayload) {
  // The parent owns the request and decides when to close the form: it stays
  // open (with the server's message) if the quote is rejected.
  if (editingQuote.value) emit('edit-quote', editingQuote.value.id, payload)
  else emit('send-quote', payload)
}

// The form closes itself once the parent finished a successful save.
defineExpose({
  closeQuoteForm: () => {
    showQuoteForm.value = false
    editingQuote.value = null
  },
  clearComposer: () => clearComposer(),
})

/** The booking this thread's most recent accepted quote / confirmation created, if any. */
const latestBookingId = computed(() => {
  for (const message of [...props.messages].reverse()) {
    if (message.meta?.type === 'booking_created' && message.meta.bookingId) return message.meta.bookingId
    if (message.quote?.bookingId) return message.quote.bookingId
  }
  return null
})

/** Quotes and system notices are part of a booking's record — they can't be deleted. */
const isDeletable = (message: ConversationMessage) =>
  !message.deleted && message.fromMe && !message.quote && (!message.meta || message.meta.type === 'job_request')

/** Reportable: the other person's own words, not a quote or a system-generated notice. */
const isReportable = (message: ConversationMessage) =>
  !message.deleted && !message.fromMe && !message.quote && (!message.meta || message.meta.type === 'job_request')

const reportTargetId = ref<string | null>(null)

const lastSeenText = computed(() => props.conversation.lastSeenAt
  ? t('dashboard.messages.lastSeen', { when: formatRelativeDate(props.conversation.lastSeenAt, locale.value) })
  : t('dashboard.messages.offline'))

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function attachmentFromFile(file: File, type: AttachmentType): MessageAttachment {
  return {
    type,
    name: file.name,
    url: URL.createObjectURL(file),
    sizeLabel: formatSize(file.size),
  }
}

function openImagePicker() {
  showAttachMenu.value = false
  imageInputRef.value?.click()
}

function openDocumentPicker() {
  showAttachMenu.value = false
  documentInputRef.value?.click()
}

function onMediaChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    clearPendingAttachment()
    pendingAttachment.value = attachmentFromFile(file, file.type.startsWith('video/') ? 'video' : 'image')
    pendingFile.value = file
  }
  input.value = ''
}

function onDocumentChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    clearPendingAttachment()
    pendingAttachment.value = attachmentFromFile(file, 'document')
    pendingFile.value = file
  }
  input.value = ''
}

function clearPendingAttachment() {
  if (pendingAttachment.value?.url) URL.revokeObjectURL(pendingAttachment.value.url)
  pendingAttachment.value = null
  pendingFile.value = null
}

function autoGrow() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

const COMMON_EMOJI = ['😀', '😂', '😍', '👍', '🙏', '🎉', '❤️', '😢', '😮', '🔥', '👏', '✅', '📸', '📅', '💬', '😅']

function insertEmoji(emoji: string) {
  draft.value += emoji
  showEmojiPicker.value = false
  nextTick(() => {
    textareaRef.value?.focus()
    autoGrow()
  })
}

function handleSend() {
  const text = draft.value.trim()
  const attachmentType = pendingAttachment.value?.type ?? null
  const file = pendingFile.value
  if ((!text && !file) || props.sending) return
  // The composer is cleared by the parent (`clearComposer`) only once the
  // message was actually delivered — a failed send used to lose what you typed.
  emit('send', { text, file, attachmentType })
}

function clearComposer() {
  draft.value = ''
  clearPendingAttachment()
  nextTick(autoGrow)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="flex h-full min-w-0 flex-1 flex-col">
    <div class="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-4 sm:px-6 dark:border-white/10">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:hidden"
          :aria-label="t('dashboard.messages.backToList')"
          @click="$emit('back')"
        >
          <UiIcon
            name="chevron-left"
            :size="18"
          />
        </button>
        <span class="relative shrink-0">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {{ initialsFor(conversation.personName) }}
          </span>
        </span>
        <div>
          <div class="text-sm font-bold">
            {{ conversation.personName }}
          </div>
          <div class="text-xs text-black/60 dark:text-white/60">
            <span>{{ lastSeenText }}</span>
            · {{ conversation.role === 'client' ? t('dashboard.messages.roleClient') : t('dashboard.messages.roleProvider') }}
            · {{ categoryLabel(conversation.categoryId, conversation.categoryName) }}
          </div>
        </div>
      </div>
      <button
        v-if="latestBookingId"
        type="button"
        @click="$emit('view-booking', latestBookingId)"
      >
        <UiTag variant="primary">
          {{ t('dashboard.messages.viewBooking') }}
        </UiTag>
      </button>
    </div>

    <div
      ref="messageListRef"
      class="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-5"
    >
      <p
        v-if="loading"
        class="py-6 text-center text-sm text-black/50 dark:text-white/50"
      >
        {{ t('dashboard.messages.loadingThread') }}
      </p>
      <div
        v-if="hasMoreBefore"
        class="mb-2 flex justify-center"
      >
        <UiButton
          variant="ghost"
          size="sm"
          :disabled="loadingOlder"
          @click="$emit('load-older')"
        >
          {{ loadingOlder ? t('dashboard.messages.loadingOlder') : t('dashboard.messages.loadOlder') }}
        </UiButton>
      </div>
      <div
        v-for="message in messages"
        :key="message.id"
        class="group flex items-end gap-1.5"
        :class="message.fromMe ? 'justify-end' : 'justify-start'"
      >
        <button
          v-if="isDeletable(message)"
          type="button"
          class="mb-1 shrink-0 rounded-full p-1.5 text-black/30 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/5 hover:text-red-600 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-red-400"
          :aria-label="t('dashboard.messages.deleteMessage')"
          @click="$emit('delete', message.id)"
        >
          <UiIcon
            name="trash"
            :size="14"
          />
        </button>

        <!-- A removed message keeps its row (so the thread's shape doesn't shift for the
             other party) but shows a placeholder instead of its original content. -->
        <div
          v-if="message.deleted"
          class="max-w-[60%] rounded-2xl px-3.5 py-2.5 text-sm text-black/40 italic dark:text-white/40"
          :class="message.fromMe ? 'rounded-br-md bg-black/5 dark:bg-white/5' : 'rounded-bl-md bg-black/5 dark:bg-white/5'"
        >
          {{ t('dashboard.messages.messageDeleted') }}
        </div>
        <!-- System notices ("booking confirmed", "quote declined") sit centred, not in a bubble. -->
        <div
          v-else-if="message.meta && message.meta.type !== 'job_request'"
          class="mx-auto my-1.5 max-w-[80%] rounded-2xl bg-black/5 px-3.5 py-1.5 text-center text-xs font-semibold text-black/60 dark:bg-white/10 dark:text-white/60"
        >
          <template v-if="message.meta.type === 'booking_created'">
            {{ t('dashboard.messages.system.bookingCreated', { when: message.meta.scheduledAt ? formatDateTime(message.meta.scheduledAt, locale) : '' }) }}
            <button
              v-if="message.meta.bookingId"
              type="button"
              class="ml-1 underline"
              @click="$emit('view-booking', message.meta.bookingId)"
            >
              {{ t('dashboard.messages.viewBooking') }}
            </button>
          </template>
          <template v-else-if="message.meta.type === 'admin_notice'">
            <span class="font-bold">{{ t('dashboard.messages.system.adminNotice', { site: siteName }) }}:</span>
            {{ message.text }}
          </template>
          <template v-else>
            {{ t('dashboard.messages.system.quoteDeclined') }}
            <span
              v-if="message.meta.reason"
              class="mt-0.5 block font-normal"
            >{{ t('dashboard.messages.system.quoteDeclinedReason', { reason: message.meta.reason }) }}</span>
          </template>
        </div>
        <DashboardQuoteCard
          v-else-if="message.quote"
          :quote="message.quote"
          :can-respond="!message.fromMe"
          :is-own="message.fromMe"
          :busy="busyQuoteId === message.quote.id"
          @accept="$emit('accept-quote', message.quote)"
          @decline="$emit('decline-quote', message.quote.id)"
          @edit="openEditQuote(message.quote)"
          @withdraw="$emit('withdraw-quote', message.quote.id)"
          @view-booking="(id) => $emit('view-booking', id)"
        />
        <DashboardJobRequestCard
          v-else-if="message.meta?.type === 'job_request'"
          :meta="message.meta"
          :text="message.text"
          :from-me="message.fromMe"
          :can-quote="canSendQuote && !message.fromMe"
          :needs-verification="needsVerificationToQuote && !message.fromMe"
          @send-quote="openNewQuote(message.meta)"
        />
        <div
          v-else
          class="max-w-[60%] rounded-2xl px-3.5 py-2.5 text-sm"
          :class="message.fromMe
            ? 'rounded-br-md bg-brand-600 text-white'
            : 'rounded-bl-md bg-black/5 text-black dark:bg-white/10 dark:text-white'"
        >
          <div
            v-if="message.attachment"
            class="mb-1.5 overflow-hidden rounded-lg"
            :class="message.attachment.type !== 'document' && 'h-44 w-56'"
          >
            <img
              v-if="message.attachment.type === 'image' && message.attachment.url"
              :src="message.attachment.url"
              class="h-full w-full object-cover"
              alt=""
            >
            <UiPlaceholderMedia
              v-else-if="message.attachment.type === 'image'"
              icon="image"
            />
            <!-- No caption track: this is whatever file the person just attached locally, not published content we control. -->
            <!-- eslint-disable-next-line vuejs-accessibility/media-has-caption -->
            <video
              v-else-if="message.attachment.type === 'video' && message.attachment.url"
              :src="message.attachment.url"
              controls
              class="h-full w-full object-cover"
            />
            <UiPlaceholderMedia
              v-else-if="message.attachment.type === 'video'"
              icon="video"
            />
            <a
              v-else
              :href="message.attachment.url || '#'"
              :download="message.attachment.name"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2.5 rounded-lg p-1"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                :class="message.fromMe ? 'bg-white/15' : 'bg-black/10 dark:bg-white/15'"
              >
                <UiIcon
                  name="file"
                  :size="17"
                />
              </span>
              <span class="min-w-0">
                <span class="block truncate text-xs font-semibold">{{ message.attachment.name }}</span>
                <span
                  v-if="message.attachment.sizeLabel"
                  class="block text-[11px] opacity-70"
                >{{ message.attachment.sizeLabel }}</span>
              </span>
            </a>
          </div>
          <div v-if="message.text">
            {{ message.text }}
          </div>
          <div
            v-if="message.fromMe"
            class="mt-1 flex items-center justify-end gap-1"
          >
            <UiIcon
              v-if="message.status === 'sent'"
              name="check"
              :size="14"
              class="text-white/70"
            />
            <UiIcon
              v-else
              name="check-check"
              :size="14"
              :class="message.status === 'seen' ? 'text-sky-300' : 'text-white/70'"
            />
          </div>
        </div>

        <button
          v-if="message.fromMe"
          type="button"
          class="mb-1 shrink-0 rounded-full p-1.5 text-black/30 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/5 hover:text-red-600 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-red-400"
          :aria-label="t('dashboard.messages.deleteMessage')"
          @click="$emit('delete', message.id)"
        >
          <UiIcon
            name="trash"
            :size="14"
          />
        </button>
        <button
          v-else-if="isReportable(message)"
          type="button"
          class="mb-1 shrink-0 rounded-full p-1.5 text-black/30 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/5 hover:text-black dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white"
          :aria-label="t('dashboard.messages.reportMessage')"
          @click="reportTargetId = message.id"
        >
          <UiIcon
            name="alert-triangle"
            :size="14"
          />
        </button>
      </div>
    </div>

    <MarketplaceReportModal
      :open="!!reportTargetId"
      type="message"
      :target-id="reportTargetId ?? ''"
      @close="reportTargetId = null"
    />

    <div
      v-if="pendingAttachment"
      class="mx-6 mb-2 flex items-center gap-2.5 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
        <UiIcon
          :name="pendingAttachment.type === 'image' ? 'image' : pendingAttachment.type === 'video' ? 'video' : 'file'"
          :size="16"
        />
      </span>
      <span class="min-w-0 flex-1 truncate text-xs font-semibold">{{ pendingAttachment.name }}</span>
      <button
        type="button"
        class="shrink-0 rounded-full p-1 text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
        :aria-label="t('dashboard.messages.removeAttachment')"
        @click="clearPendingAttachment"
      >
        <UiIcon
          name="x"
          :size="15"
        />
      </button>
    </div>

    <p
      v-if="sendError"
      role="alert"
      class="border-t border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
    >
      {{ sendError }}
    </p>

    <p
      v-if="conversation.otherDeleted"
      class="border-t border-black/10 bg-black/5 px-4 py-4 text-center text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
    >
      {{ t('dashboard.messages.recipientDeleted') }}
    </p>

    <form
      v-else
      class="flex items-end gap-2 border-t border-black/10 px-4 py-3 dark:border-white/10"
      @submit.prevent="handleSend"
    >
      <div class="relative flex shrink-0 items-center">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          :aria-label="t('dashboard.messages.addEmoji')"
          @click="showEmojiPicker = !showEmojiPicker"
        >
          <UiIcon
            name="smile"
            :size="20"
          />
        </button>
        <div
          v-if="showEmojiPicker"
          ref="emojiPickerRoot"
          class="absolute bottom-12 left-0 z-10 grid w-56 grid-cols-8 gap-1 rounded-2xl border border-black/10 bg-white p-2.5 shadow-lg dark:border-white/10 dark:bg-black"
        >
          <button
            v-for="emoji in COMMON_EMOJI"
            :key="emoji"
            type="button"
            class="rounded-lg p-1.5 text-lg hover:bg-black/5 dark:hover:bg-white/10"
            @click="insertEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <button
        v-if="canSendQuote"
        type="button"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
        :aria-label="t('dashboard.messages.sendQuote')"
        @click="openNewQuote()"
      >
        <UiIcon
          name="briefcase"
          :size="19"
        />
      </button>
      <NuxtLinkLocale
        v-else-if="needsVerificationToQuote"
        :to="{ path: '/profile', query: { tab: 'kyc' } }"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-accent-700 hover:bg-accent-50 dark:text-accent-100 dark:hover:bg-accent-700/20"
        :aria-label="t('dashboard.messages.quote.verifyToSend')"
        :title="t('dashboard.messages.quote.verifyToSend')"
      >
        <UiIcon
          name="shield-check"
          :size="19"
        />
      </NuxtLinkLocale>

      <div class="relative flex shrink-0 items-center">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          :aria-label="t('dashboard.messages.attachFile')"
          @click="showAttachMenu = !showAttachMenu"
        >
          <UiIcon
            name="paperclip"
            :size="19"
          />
        </button>
        <div
          v-if="showAttachMenu"
          ref="attachMenuRoot"
          class="absolute bottom-12 left-0 z-10 flex w-44 flex-col gap-0.5 rounded-2xl border border-black/10 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-black"
        >
          <button
            type="button"
            class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
            @click="openImagePicker"
          >
            <UiIcon
              name="image"
              :size="16"
              class="text-brand-600"
            />
            {{ t('dashboard.messages.attachPhotoVideo') }}
          </button>
          <button
            type="button"
            class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
            @click="openDocumentPicker"
          >
            <UiIcon
              name="file"
              :size="16"
              class="text-accent-600"
            />
            {{ t('dashboard.messages.attachDocument') }}
          </button>
        </div>
        <input
          ref="imageInputRef"
          type="file"
          accept="image/*,video/*"
          class="hidden"
          :aria-label="t('dashboard.messages.attachPhotoVideo')"
          @change="onMediaChosen"
        >
        <input
          ref="documentInputRef"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          class="hidden"
          :aria-label="t('dashboard.messages.attachDocument')"
          @change="onDocumentChosen"
        >
      </div>

      <textarea
        ref="textareaRef"
        v-model="draft"
        rows="1"
        class="max-h-40 flex-1 resize-none rounded-3xl border border-black/10 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        :placeholder="t('dashboard.messages.composerPlaceholder')"
        :aria-label="t('dashboard.messages.composerPlaceholder')"
        @input="autoGrow"
        @keydown="handleKeydown"
      />

      <button
        type="submit"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="sending || (!draft.trim() && !pendingAttachment)"
        :aria-label="t('dashboard.messages.send')"
      >
        <UiIcon
          name="send"
          :size="17"
        />
      </button>
    </form>

    <DashboardQuoteFormModal
      :open="showQuoteForm"
      :quote="editingQuote"
      :prefill="quotePrefill"
      :services="services"
      :submitting="quoteSubmitting"
      :errors="quoteErrors"
      @close="showQuoteForm = false"
      @submit="handleQuoteSubmit"
    />
  </div>
</template>
