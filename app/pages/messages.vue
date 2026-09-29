<script setup lang="ts">
import type { AttachmentType, Conversation } from '#shared/types/dashboard'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const { t } = useI18n()
const route = useRoute()

const { data: conversations, refresh } = await useApi<Conversation[]>('/dashboard/conversations', {
  key: 'dashboard-conversations',
  default: () => [],
})

const search = ref('')
const activeId = ref('')

// Swipe-to-archive on the list (see `UiSwipeAction`) — archiving is per-side
// on the backend (see `ConversationController::archive`), so it drops out of
// `conversations` on the next refresh without any client-side filtering.
async function archiveConversation(id: string) {
  if (activeId.value === id) {
    activeId.value = ''
    mobileThreadOpen.value = false
  }
  try {
    await useApiFetch(`/api/dashboard/conversations/${id}/archive`, { method: 'PATCH' })
    await refresh()
  }
  catch (error) {
    console.error('Failed to archive conversation', error)
  }
}

// Master-detail collapses to one pane on mobile (native chat-app pattern —
// see CLAUDE.md): the list and thread never show side by side below `md`,
// so a real tap (or an incoming `?conversation=`) is what reveals the
// thread, not the list's default auto-select of `list[0]` below. While the
// thread pane is showing on mobile, `<AppBottomNav>` steps aside too — its
// own fixed composer would otherwise stack on top of the tab bar (see
// `useBottomNav`) — and `onUnmounted` guarantees that gets reset even if
// the user navigates away mid-thread.
const mobileThreadOpen = ref(false)
const bottomNav = useBottomNav()

watch(mobileThreadOpen, (open) => {
  if (open) bottomNav.hide()
  else bottomNav.show()
})
onUnmounted(() => bottomNav.show())

watch(conversations, (list) => {
  if (!activeId.value) {
    const requested = typeof route.query.conversation === 'string' ? route.query.conversation : undefined
    const match = requested ? list?.find(c => c.id === requested) : undefined
    activeId.value = match?.id ?? list?.[0]?.id ?? ''
    // Arriving with an explicit `?conversation=` is intent to view that
    // thread; the plain `list[0]` fallback above is not — it stays on the
    // list on mobile until the person actually taps a conversation.
    if (match) mobileThreadOpen.value = true
  }
}, { immediate: true })

// A table row's "Message" action navigates to `?conversation=<id>` on this
// same page (Nuxt reuses the component instance rather than remounting it),
// so react to in-place query changes too, not just the initial load.
watch(() => route.query.conversation, (value) => {
  const requested = typeof value === 'string' ? value : undefined
  if (requested && conversations.value?.some(c => c.id === requested)) {
    activeId.value = requested
    mobileThreadOpen.value = true
  }
})

function selectConversation(id: string) {
  activeId.value = id
  mobileThreadOpen.value = true
}

const filteredConversations = computed(() => {
  const query = search.value.trim().toLowerCase()
  return (conversations.value ?? [])
    .filter(conversation => !query || conversation.personName.toLowerCase().includes(query))
})

const activeConversation = computed(() =>
  (conversations.value ?? []).find(conversation => conversation.id === activeId.value) ?? conversations.value?.[0],
)

const activeMessages = computed(() => activeConversation.value?.messages ?? [])

async function handleSend({ text, file, attachmentType }: { text: string, file: File | null, attachmentType: AttachmentType | null }) {
  const conversationId = activeId.value
  if (!conversationId) return

  const body = new FormData()
  if (text) body.append('text', text)
  if (file) {
    body.append('attachment', file)
    body.append('attachmentType', attachmentType ?? 'document')
  }

  try {
    await useApiFetch(`/api/dashboard/conversations/${conversationId}/messages`, { method: 'POST', body })
    await refresh()
  }
  catch (error) {
    console.error('Failed to send message', error)
  }
}

async function handleDelete(messageId: string) {
  try {
    await useApiFetch(`/api/dashboard/messages/${messageId}`, { method: 'DELETE' })
    await refresh()
  }
  catch (error) {
    console.error('Failed to delete message', error)
  }
}

async function handleSendQuote(payload: { basePriceUsd: number, baseHours: number, extraHourlyRateUsd: number, note: string }) {
  const conversationId = activeId.value
  if (!conversationId) return

  try {
    await useApiFetch(`/api/dashboard/conversations/${conversationId}/quotes`, { method: 'POST', body: payload })
    await refresh()
  }
  catch (error) {
    console.error('Failed to send quote', error)
  }
}

async function handleAcceptQuote(quoteId: string) {
  try {
    await useApiFetch(`/api/dashboard/quotes/${quoteId}/accept`, { method: 'PATCH' })
    await refresh()
  }
  catch (error) {
    console.error('Failed to accept quote', error)
  }
}

async function handleDeclineQuote(quoteId: string) {
  try {
    await useApiFetch(`/api/dashboard/quotes/${quoteId}/decline`, { method: 'PATCH' })
    await refresh()
  }
  catch (error) {
    console.error('Failed to decline quote', error)
  }
}

useSeoMeta({
  title: t('dashboard.messages.title'),
})
</script>

<template>
  <div class="flex h-[calc(100vh-160px)] min-h-[560px] flex-col gap-5">
    <div :class="mobileThreadOpen ? 'hidden md:block' : 'block'">
      <h1 class="font-display text-2xl font-bold">
        {{ t('dashboard.messages.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
        {{ t('dashboard.messages.subtitle') }}
      </p>
    </div>

    <div class="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
      <div
        class="w-full shrink-0 flex-col border-r border-black/10 md:flex md:w-[320px] dark:border-white/10"
        :class="mobileThreadOpen ? 'hidden' : 'flex'"
      >
        <div class="p-3">
          <UiInput
            v-model="search"
            icon="search"
            :placeholder="t('dashboard.messages.searchPlaceholder')"
          />
        </div>
        <div class="flex-1 overflow-y-auto px-2 pb-3">
          <DashboardConversationList
            :conversations="filteredConversations"
            :active-id="activeId"
            @select="selectConversation"
            @archive="archiveConversation"
          />
        </div>
      </div>

      <div
        class="w-full min-w-0 md:flex md:flex-1"
        :class="mobileThreadOpen ? 'flex' : 'hidden'"
      >
        <DashboardMessageThread
          v-if="activeConversation"
          :conversation="activeConversation"
          :messages="activeMessages"
          @back="mobileThreadOpen = false"
          @send="handleSend"
          @delete="handleDelete"
          @send-quote="handleSendQuote"
          @accept-quote="handleAcceptQuote"
          @decline-quote="handleDeclineQuote"
        />
      </div>
    </div>
  </div>
</template>
