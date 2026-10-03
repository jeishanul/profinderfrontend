<script setup lang="ts">
import type { AttachmentType, Conversation, KycState, Paged, Quote, QuotePayload, ServiceListing } from '#shared/types/dashboard'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const route = useRoute()
const localePath = useLocalePath()
const session = useSession()
const toast = useToast()
const { confirm, prompt } = useConfirm()

const search = ref('')
const debouncedSearch = refDebounced(search, 300)

// Inbox rows only carry the newest message; the open thread is loaded on its
// own (see `useConversationThread`) and kept fresh by the polling below.
const inbox = await usePagedList<Conversation>('/dashboard/conversations', {
  key: 'dashboard-conversations',
  query: computed(() => ({ q: debouncedSearch.value || undefined })),
  perPage: 30,
})
const archived = usePagedList<Conversation>('/dashboard/conversations', {
  key: 'dashboard-conversations-archived',
  query: computed(() => ({ archived: 1, q: debouncedSearch.value || undefined })),
  perPage: 30,
  lazy: true,
  server: false,
  immediate: false,
})
const refreshInbox = inbox.refresh
const refreshArchived = archived.refresh

// Offered as an optional tag on a quote; only providers can send quotes.
const { data: servicesPage } = useApi<Paged<ServiceListing> | null>('/dashboard/services', {
  key: 'dashboard-services-picker',
  lazy: true,
  server: false,
  query: { perPage: 100 },
  immediate: session.isProvider.value,
  default: () => null,
})
const services = computed(() => servicesPage.value?.data ?? [])

// Same key the dashboard layout uses, so this is usually already loaded. Unknown (null) is treated as "fine":
// the server still refuses an unverified provider's quote, so a slow load never blocks anyone wrongly.
const { data: kyc } = useApi<KycState>('/dashboard/kyc', {
  key: 'dashboard-kyc',
  lazy: true,
  server: false,
  immediate: session.isProvider.value,
})
const providerVerified = computed(() => kyc.value ? kyc.value.isVerified : undefined)

const view = ref<'inbox' | 'archived'>('inbox')
const activeId = ref('')
const threadRef = useTemplateRef('threadRef')
const thread = useConversationThread()
const isDesktop = useMediaQuery('(min-width: 768px)')
const visibility = useDocumentVisibility()

const viewOptions = computed(() => [
  { value: 'inbox', label: t('dashboard.messages.tabs.inbox'), count: inbox.meta.value?.total ?? 0 },
  { value: 'archived', label: t('dashboard.messages.tabs.archived'), count: archived.meta.value?.total ?? 0 },
])

watch(view, (next) => {
  if (next === 'archived') refreshArchived()
})

// Master-detail collapses to one pane on mobile (native chat-app pattern —
// see CLAUDE.md): the list and thread never show side by side below `md`,
// so a real tap (or an incoming `?conversation=`) is what reveals the
// thread. While the thread pane is showing on mobile, `<AppBottomNav>` steps
// aside too (see `useBottomNav`), and `onUnmounted` guarantees that resets.
const mobileThreadOpen = ref(false)
const bottomNav = useBottomNav()

watch(mobileThreadOpen, (open) => {
  if (open) bottomNav.hide()
  else bottomNav.show()
})
onUnmounted(() => bottomNav.show())

// The server already filters by `q` (name or last message, not just this page's rows).
const currentList = computed(() => view.value === 'archived' ? archived.items.value : inbox.items.value)

const currentPager = computed(() => (view.value === 'archived' ? archived : inbox))

/** The open thread's header row: the fresh copy from the thread fetch, else the list row. */
const activeConversation = computed<Conversation | undefined>(() =>
  thread.conversation.value?.id === activeId.value
    ? thread.conversation.value
    : [...inbox.items.value, ...archived.items.value].find(conversation => conversation.id === activeId.value),
)

/** Whether the person can actually see the thread right now (on mobile it can be selected but hidden). */
const isViewingThread = computed(() => Boolean(activeId.value) && (isDesktop.value || mobileThreadOpen.value))

async function refreshBadges() {
  await refreshNuxtData([UNREAD_MESSAGES_KEY])
}

/** Opening a thread (or a new message arriving in it) marks it read and clears its badge. */
async function markRead() {
  const id = activeId.value
  if (!id || !isViewingThread.value) return
  const row = activeConversation.value
  if (row && row.unreadCount === 0) return
  try {
    await useApiFetch(`/api/dashboard/conversations/${id}/read`, { method: 'PATCH' })
    await Promise.all([refreshInbox(), refreshBadges()])
  }
  catch {
    // Not worth interrupting the reader for; the next poll tries again.
  }
}

async function selectConversation(id: string) {
  activeId.value = id
  mobileThreadOpen.value = true
  sendError.value = ''
  await thread.open(id)
  await markRead()
}

// The very first load: honour `?conversation=`, else show the first thread on desktop.
// (`?conversation=` works even for a thread that isn't in the inbox, e.g. an archived one.)
onMounted(() => {
  const requested = typeof route.query.conversation === 'string' ? route.query.conversation : ''
  if (requested) selectConversation(requested)
  else if (isDesktop.value && inbox.items.value[0]) selectConversation(inbox.items.value[0].id)
})

// A table row's "Message" action navigates to `?conversation=<id>` on this
// same page (Nuxt reuses the component instance), so react to in-place changes too.
watch(() => route.query.conversation, (value) => {
  if (typeof value === 'string' && value && value !== activeId.value) selectConversation(value)
})

// Back from a thread on mobile: stop treating it as read-in-progress.
watch(mobileThreadOpen, (open) => {
  if (open) markRead()
})

/** Re-reads the open thread and the inbox (after you act on either). */
async function refreshThread() {
  await Promise.all([thread.refresh(), refreshInbox()])
}

// --- Live updates -------------------------------------------------------------
// Polling keeps this simple (no websocket server): the open thread every 10 s,
// the inbox every 30 s, only while the tab is visible.
useIntervalFn(async () => {
  if (visibility.value !== 'visible' || !activeId.value) return
  const gainedIncoming = await thread.refresh()
  if (gainedIncoming) {
    await refreshInbox()
    await markRead()
  }
}, 10_000)

useIntervalFn(() => {
  if (visibility.value === 'visible') {
    refreshInbox()
    if (view.value === 'archived') refreshArchived()
  }
}, 30_000)

// --- Archive / unarchive --------------------------------------------------------
async function archiveConversation(id: string) {
  try {
    await useApiFetch(`/api/dashboard/conversations/${id}/archive`, { method: 'PATCH' })
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.messages.errors.archive')))
    return
  }
  if (activeId.value === id) {
    activeId.value = ''
    mobileThreadOpen.value = false
    thread.close()
  }
  await Promise.all([refreshInbox(), refreshBadges()])
  toast.success(t('dashboard.messages.archived'), {
    label: t('dashboard.messages.undo'),
    run: () => unarchiveConversation(id, false),
  })
}

async function unarchiveConversation(id: string, announce = true) {
  try {
    await useApiFetch(`/api/dashboard/conversations/${id}/unarchive`, { method: 'PATCH' })
    await Promise.all([refreshInbox(), refreshArchived(), refreshBadges()])
    if (announce) toast.success(t('dashboard.messages.unarchived'))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.messages.errors.unarchive')))
  }
}

// --- Sending ------------------------------------------------------------------
const isSending = ref(false)
const sendError = ref('')

async function handleSend({ text, file, attachmentType }: { text: string, file: File | null, attachmentType: AttachmentType | null }) {
  const conversationId = activeId.value
  if (!conversationId || isSending.value) return

  const body = new FormData()
  if (text) body.append('text', text)
  if (file) {
    body.append('attachment', file)
    body.append('attachmentType', attachmentType ?? 'document')
  }

  isSending.value = true
  sendError.value = ''
  try {
    await useApiFetch(`/api/dashboard/conversations/${conversationId}/messages`, { method: 'POST', body })
    // Only now is the draft cleared — a failed send keeps what was typed.
    threadRef.value?.clearComposer()
    await refreshThread()
  }
  catch (error) {
    sendError.value = Object.values(apiFieldErrors(error))[0] ?? apiErrorMessage(error, t('dashboard.messages.errors.send'))
  }
  finally {
    isSending.value = false
  }
}

async function handleDelete(messageId: string) {
  const confirmed = await confirm({
    title: t('dashboard.messages.deleteConfirm.title'),
    message: t('dashboard.messages.deleteConfirm.message'),
    confirmLabel: t('dashboard.messages.deleteMessage'),
    tone: 'danger',
  })
  if (!confirmed) return

  try {
    await useApiFetch(`/api/dashboard/messages/${messageId}`, { method: 'DELETE' })
    await refreshThread()
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.messages.errors.delete')))
  }
}

const busyQuoteId = ref<string | null>(null)
const quoteSubmitting = ref(false)
const quoteErrors = ref<Record<string, string>>({})

/** Runs a quote action with a busy flag, refreshes the thread, and reports failures as a toast. */
async function runQuoteAction(quoteId: string, action: () => Promise<void>, failureKey: string) {
  busyQuoteId.value = quoteId
  try {
    await action()
    await refreshThread()
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t(failureKey)))
    await refreshThread()
  }
  finally {
    busyQuoteId.value = null
  }
}

/** Create or edit: keeps the form open and shows the server's reason if the quote is rejected. */
async function saveQuote(request: () => Promise<unknown>, successKey: string, failureKey: string) {
  quoteSubmitting.value = true
  quoteErrors.value = {}
  try {
    await request()
    await refreshThread()
    threadRef.value?.closeQuoteForm()
    toast.success(t(successKey))
  }
  catch (error) {
    quoteErrors.value = apiFieldErrors(error)
    if (Object.keys(quoteErrors.value).length === 0) quoteErrors.value = { form: apiErrorMessage(error, t(failureKey)) }
  }
  finally {
    quoteSubmitting.value = false
  }
}

function handleSendQuote(payload: QuotePayload) {
  const conversationId = activeId.value
  if (!conversationId) return
  return saveQuote(
    () => useApiFetch(`/api/dashboard/conversations/${conversationId}/quotes`, { method: 'POST', body: payload }),
    'dashboard.messages.quote.sent',
    'dashboard.messages.quote.errors.send',
  )
}

function handleEditQuote(quoteId: string, payload: QuotePayload) {
  return saveQuote(
    () => useApiFetch(`/api/dashboard/quotes/${quoteId}`, { method: 'PATCH', body: payload }),
    'dashboard.messages.quote.updated',
    'dashboard.messages.quote.errors.update',
  )
}

async function handleWithdrawQuote(quoteId: string) {
  const confirmed = await confirm({
    title: t('dashboard.messages.quote.withdrawConfirm.title'),
    message: t('dashboard.messages.quote.withdrawConfirm.message'),
    confirmLabel: t('dashboard.messages.quote.withdrawConfirm.confirm'),
    tone: 'danger',
  })
  if (!confirmed) return
  await runQuoteAction(quoteId, async () => {
    await useApiFetch(`/api/dashboard/quotes/${quoteId}/withdraw`, { method: 'PATCH' })
    toast.success(t('dashboard.messages.quote.withdrawn_toast'))
  }, 'dashboard.messages.quote.errors.withdraw')
}

async function handleAcceptQuote(quote: Quote) {
  // Accepting books a real job, so spell out what is being agreed before it happens.
  const confirmed = await confirm({
    title: t('dashboard.messages.quote.acceptConfirm.title'),
    message: t('dashboard.messages.quote.acceptConfirm.message', {
      when: quote.scheduledAt ? formatDateTime(quote.scheduledAt, locale.value) : '',
      price: money(quote.basePriceUsd),
    }),
    confirmLabel: t('dashboard.messages.quote.acceptConfirm.confirm'),
  })
  if (!confirmed) return
  await runQuoteAction(quote.id, async () => {
    await useApiFetch(`/api/dashboard/quotes/${quote.id}/accept`, { method: 'PATCH' })
    toast.success(t('dashboard.messages.quote.acceptedToast'))
  }, 'dashboard.messages.quote.errors.accept')
}

async function handleDeclineQuote(quoteId: string) {
  // An optional note lets the provider know why (too expensive, wrong day…); cancelling the dialog declines nothing.
  const reason = await prompt({
    title: t('dashboard.messages.quote.declineConfirm.title'),
    message: t('dashboard.messages.quote.declineConfirm.message'),
    confirmLabel: t('dashboard.messages.quote.declineConfirm.confirm'),
    tone: 'danger',
    input: { label: t('dashboard.messages.quote.declineConfirm.reasonLabel'), placeholder: t('dashboard.messages.quote.declineConfirm.reasonPlaceholder'), maxLength: 255 },
  })
  if (reason === null) return
  await runQuoteAction(quoteId, async () => {
    await useApiFetch(`/api/dashboard/quotes/${quoteId}/decline`, { method: 'PATCH', body: reason ? { reason } : {} })
    toast.success(t('dashboard.messages.quote.declinedToast'))
  }, 'dashboard.messages.quote.errors.decline')
}

// Providers manage jobs under "Clients served", clients under "My purchases".
function handleViewBooking(bookingId: string) {
  const page = activeConversation.value?.role === 'client' ? '/clients' : '/purchases'
  navigateTo(localePath({ path: page, query: { booking: bookingId } }))
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
        <div class="flex flex-col gap-2.5 p-3">
          <UiInput
            v-model="search"
            icon="search"
            :placeholder="t('dashboard.messages.searchPlaceholder')"
          />
          <DashboardFilterTabs
            v-model="view"
            :options="viewOptions"
          />
        </div>
        <div class="flex-1 overflow-y-auto px-2 pb-3">
          <DashboardConversationList
            :conversations="currentList"
            :active-id="activeId"
            :archived-view="view === 'archived'"
            :searching="search.trim().length > 0"
            @select="selectConversation"
            @archive="archiveConversation"
            @unarchive="unarchiveConversation"
          />
          <DashboardLoadMore
            class="mt-3"
            :shown="currentPager.items.value.length"
            :total="currentPager.meta.value?.total ?? 0"
            :has-more="currentPager.hasMore.value"
            :loading="currentPager.loadingMore.value"
            :failed="currentPager.loadMoreFailed.value"
            @more="currentPager.loadMore()"
          />
        </div>
      </div>

      <div
        class="w-full min-w-0 md:flex md:flex-1"
        :class="mobileThreadOpen ? 'flex' : 'hidden'"
      >
        <DashboardMessageThread
          v-if="activeConversation"
          ref="threadRef"
          :conversation="activeConversation"
          :messages="thread.messages.value"
          :has-more-before="thread.hasMoreBefore.value"
          :loading-older="thread.isLoadingOlder.value"
          :loading="thread.isLoading.value"
          :sending="isSending"
          :send-error="sendError"
          :services="services"
          :provider-verified="providerVerified"
          :busy-quote-id="busyQuoteId"
          :quote-submitting="quoteSubmitting"
          :quote-errors="quoteErrors"
          @back="mobileThreadOpen = false"
          @send="handleSend"
          @delete="handleDelete"
          @send-quote="handleSendQuote"
          @edit-quote="handleEditQuote"
          @withdraw-quote="handleWithdrawQuote"
          @accept-quote="handleAcceptQuote"
          @decline-quote="handleDeclineQuote"
          @view-booking="handleViewBooking"
          @load-older="thread.loadOlder"
        />
        <div
          v-else
          class="flex flex-1 items-center justify-center p-8 text-center text-sm text-black/50 dark:text-white/50"
        >
          {{ thread.loadFailed.value ? t('dashboard.messages.threadFailed') : t('dashboard.messages.pickConversation') }}
        </div>
      </div>
    </div>
  </div>
</template>
