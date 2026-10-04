import type { Conversation, ConversationMessage } from '#shared/types/dashboard'

const THREAD_PAGE = 30

/**
 * One open chat thread: the newest page of messages, "load older", and a
 * cheap `refresh()` that the page runs on a timer so new messages (and "seen"
 * ticks) appear without a reload.
 *
 * Why this isn't `useApi`: it is imperative, accumulating state keyed on
 * whichever conversation is selected — pages of older messages are merged in
 * and polled updates are merged by id, which a single reactive `useFetch`
 * result can't express. All requests still go through `useApiFetch`.
 */
export function useConversationThread() {
  const conversation = shallowRef<Conversation | null>(null)
  const messages = ref<ConversationMessage[]>([])
  const hasMoreBefore = ref(false)
  const isLoading = ref(false)
  const isLoadingOlder = ref(false)
  const loadFailed = ref(false)

  // Guards against a slow response for a conversation the user already left.
  let requestToken = 0

  const byId = (a: ConversationMessage, b: ConversationMessage) => Number(a.id) - Number(b.id)

  async function fetchPage(id: string, before?: string) {
    return await useApiFetch<Conversation>(`/api/dashboard/conversations/${id}`, {
      query: { limit: THREAD_PAGE, ...(before ? { before } : {}) },
    })
  }

  /** Opens a conversation: replaces everything with its newest page. */
  async function open(id: string) {
    const token = ++requestToken
    isLoading.value = true
    loadFailed.value = false
    messages.value = []
    hasMoreBefore.value = false
    try {
      const result = await fetchPage(id)
      if (token !== requestToken) return
      conversation.value = result
      messages.value = result.messages ?? []
      hasMoreBefore.value = result.hasMoreBefore ?? false
    }
    catch {
      if (token === requestToken) loadFailed.value = true
    }
    finally {
      if (token === requestToken) isLoading.value = false
    }
  }

  /**
   * Re-reads the newest page and merges it in: new messages are appended,
   * changed ones (status ticks) updated, and ones deleted in that window
   * dropped — while older pages already loaded stay put.
   * Returns true when the thread gained a message from the other person.
   */
  async function refresh(): Promise<boolean> {
    const id = conversation.value?.id
    if (!id) return false
    const token = requestToken
    try {
      const result = await fetchPage(id)
      if (token !== requestToken) return false

      const fresh = result.messages ?? []
      const windowStart = fresh.length > 0 ? Number(fresh[0]!.id) : Number.POSITIVE_INFINITY
      const knownIds = new Set(messages.value.map(message => message.id))
      const gainedIncoming = fresh.some(message => !knownIds.has(message.id) && !message.fromMe)

      messages.value = [
        ...messages.value.filter(message => Number(message.id) < windowStart),
        ...fresh,
      ].sort(byId)
      conversation.value = { ...result, messages: undefined }
      return gainedIncoming
    }
    catch {
      return false
    }
  }

  async function loadOlder() {
    const id = conversation.value?.id
    const oldest = messages.value[0]
    if (!id || !oldest || isLoadingOlder.value) return
    isLoadingOlder.value = true
    const token = requestToken
    try {
      const result = await fetchPage(id, oldest.id)
      if (token !== requestToken) return
      const known = new Set(messages.value.map(message => message.id))
      messages.value = [...(result.messages ?? []).filter(message => !known.has(message.id)), ...messages.value].sort(byId)
      hasMoreBefore.value = result.hasMoreBefore ?? false
    }
    finally {
      isLoadingOlder.value = false
    }
  }

  function close() {
    requestToken++
    conversation.value = null
    messages.value = []
    hasMoreBefore.value = false
  }

  return { conversation, messages, hasMoreBefore, isLoading, isLoadingOlder, loadFailed, open, refresh, loadOlder, close }
}
