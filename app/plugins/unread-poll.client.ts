import { UNREAD_MESSAGES_KEY, UNREAD_NOTIFICATIONS_KEY } from '~/composables/useUnreadCounts'

const BADGE_KEYS = [UNREAD_NOTIFICATIONS_KEY, UNREAD_MESSAGES_KEY]

/**
 * Keeps the header's unread badge fresh without a reload: re-asks the server
 * for the count every 30 s while the tab is visible and someone is signed in.
 * (A tab in the background does nothing; it catches up when it becomes visible.)
 */
export default defineNuxtPlugin(() => {
  const session = useSession()
  const visibility = useDocumentVisibility()

  useIntervalFn(() => {
    if (session.isAuthenticated.value && visibility.value === 'visible') {
      refreshNuxtData(BADGE_KEYS)
    }
  }, 30_000)

  watch(visibility, (state) => {
    if (state === 'visible' && session.isAuthenticated.value) refreshNuxtData(BADGE_KEYS)
  })
})
