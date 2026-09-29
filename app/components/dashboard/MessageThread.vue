<script setup lang="ts">
import type { AttachmentType, Conversation, ConversationMessage, MessageAttachment } from '#shared/types/dashboard'

// Auto-imported as <DashboardMessageThread/>. The right-hand panel of the
// messages page: header (presence), the bubble list (attachments + status
// ticks + per-message delete), and a WhatsApp-style composer (emoji,
// attach-menu, auto-growing textarea). Sending/deleting/quoting all call the
// real API now (see `messages.vue`) — this component still only emits, the
// parent page owns the actual API calls and the message list.
const props = defineProps<{
  conversation: Conversation
  messages: ConversationMessage[]
}>()

const emit = defineEmits<{
  'send': [payload: { text: string, file: File | null, attachmentType: AttachmentType | null }]
  'delete': [messageId: string]
  'send-quote': [payload: { basePriceUsd: number, baseHours: number, extraHourlyRateUsd: number, note: string }]
  'accept-quote': [quoteId: string]
  'decline-quote': [quoteId: string]
  /** Mobile-only back button (see `messages.vue`'s list/thread split) — a
   * no-op on desktop, where nothing listens for it since the list stays
   * visible alongside the thread there. */
  'back': []
}>()

// A quote only makes sense flowing provider -> client (see
// `DashboardQuoteFormModal`'s doc comment) — `conversation.role === 'client'`
// means the account is acting as the provider in this thread.
const canSendQuote = computed(() => props.conversation.role === 'client')
const showQuoteForm = ref(false)

const { t } = useI18n()

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

// New message (sent or received) or a different thread selected — always
// jump to the latest message, the same way a real chat app never leaves you
// scrolled up on your own newly sent message.
watch(() => props.messages.length, () => nextTick(scrollToBottom))

watch(() => props.conversation.id, () => {
  draft.value = ''
  clearPendingAttachment()
  showAttachMenu.value = false
  showEmojiPicker.value = false
  showQuoteForm.value = false
  nextTick(scrollToBottom)
})

function handleQuoteSubmit(payload: { basePriceUsd: number, baseHours: number, extraHourlyRateUsd: number, note: string }) {
  emit('send-quote', payload)
  showQuoteForm.value = false
}

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
  if (!text && !file) return
  emit('send', { text, file, attachmentType })
  draft.value = ''
  pendingAttachment.value = null
  pendingFile.value = null
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
          <span
            v-if="conversation.online"
            class="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white dark:ring-black"
          />
        </span>
        <div>
          <div class="text-sm font-bold">
            {{ conversation.personName }}
          </div>
          <div class="text-xs text-black/60 dark:text-white/60">
            <span :class="conversation.online && 'font-semibold text-brand-700 dark:text-brand-100'">
              {{ conversation.online ? t('dashboard.messages.online') : conversation.lastSeenLabel }}
            </span>
            · {{ conversation.role === 'client' ? t('dashboard.messages.roleClient') : t('dashboard.messages.roleProvider') }}
            · {{ t(`marketplace.categories.${conversation.categoryId}.label`) }}
          </div>
        </div>
      </div>
      <NuxtLinkLocale
        v-if="conversation.role === 'client'"
        to="/clients"
      >
        <UiTag variant="primary">
          {{ t('dashboard.messages.viewBooking') }}
        </UiTag>
      </NuxtLinkLocale>
    </div>

    <div
      ref="messageListRef"
      class="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-5"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        class="group flex items-end gap-1.5"
        :class="message.fromMe ? 'justify-end' : 'justify-start'"
      >
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

        <DashboardQuoteCard
          v-if="message.quote"
          :quote="message.quote"
          :can-respond="!message.fromMe"
          @accept="$emit('accept-quote', message.quote.id)"
          @decline="$emit('decline-quote', message.quote.id)"
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
          v-if="!message.fromMe"
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
      </div>
    </div>

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

    <form
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
        @click="showQuoteForm = true"
      >
        <UiIcon
          name="briefcase"
          :size="19"
        />
      </button>

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
        :disabled="!draft.trim() && !pendingAttachment"
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
      @close="showQuoteForm = false"
      @submit="handleQuoteSubmit"
    />
  </div>
</template>
