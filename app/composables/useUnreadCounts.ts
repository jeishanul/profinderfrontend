/** `useApi` key of the unread-messages badge. */
export const UNREAD_MESSAGES_KEY = 'dashboard-unread-messages'

/**
 * New applicants on the consumer's job posts ride along on the unread-messages poll (one request for both), so
 * refreshing either refreshes both.
 */
export const UNREAD_APPLICANTS_KEY = UNREAD_MESSAGES_KEY

/** `useApi` key of the unread-notifications badge — refreshed whenever one is read, deleted or polled. */
export const UNREAD_NOTIFICATIONS_KEY = 'dashboard-unread-notifications'

/**
 * Unread message/notification counts for the header icon badges — shared by
 * both `AppHeader.vue` and the dashboard topbar (`layouts/dashboard.vue`) so
 * neither duplicates its own fetch logic. Shares `useApi` keys with
 * `messages.vue`/`notifications.vue`, so opening the panel itself reuses the
 * same request instead of firing a second one.
 *
 * Only fetched once authenticated: login/logout always change the active
 * layout (dashboard <-> default), which remounts whichever header is
 * showing, so reading `session.isAuthenticated` once at setup time (via
 * `immediate`) is enough — no reactive re-fetch needed mid-mount.
 */
export function useUnreadCounts() {
  const session = useSession()

  // Just the number of conversations with something unread — the badge used to
  // download every conversation (with every message) to count them.
  const { data: unreadConversations } = useApi<{ count: number, newApplicants?: number }>('/dashboard/conversations/unread-count', {
    key: UNREAD_MESSAGES_KEY,
    lazy: true,
    // Browser only: personal, polled from there anyway (plugins/unread-poll.client.ts), and a badge that appears a
    // moment after the page isn't worth a server-side API call on every page a signed-in person opens.
    server: false,
    // The header, bottom nav, More menu and quick tiles all call this on the same mount. With the default `cancel`
    // each one aborted the request before it and sent its own (3-4 per badge per page load, all reaching the
    // server); `defer` makes them share the one in flight.
    dedupe: 'defer',
    immediate: session.isAuthenticated.value,
    default: () => ({ count: 0, newApplicants: 0 }),
  })
  // The real number from the server — counting "unread among the loaded page"
  // under-reported once there were more notifications than one page holds.
  const { data: unread } = useApi<{ count: number }>('/dashboard/notifications/unread-count', {
    key: UNREAD_NOTIFICATIONS_KEY,
    lazy: true,
    server: false,
    dedupe: 'defer',
    immediate: session.isAuthenticated.value,
    default: () => ({ count: 0 }),
  })

  const unreadMessages = computed(() => unreadConversations.value?.count ?? 0)
  const unreadNotifications = computed(() => unread.value?.count ?? 0)
  const newApplicants = computed(() => unreadConversations.value?.newApplicants ?? 0)

  return {
    unreadMessages,
    unreadNotifications,
    newApplicants,
  }
}
