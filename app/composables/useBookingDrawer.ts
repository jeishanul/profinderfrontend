/**
 * Which booking's detail drawer is open (one drawer, mounted in the dashboard
 * layout, so Purchases, Clients, the overview and chat threads can all open it
 * the same way). The id is mirrored to `?booking=` so a notification or an
 * email link can deep-link straight to a booking — see `layouts/dashboard.vue`.
 */
export function useBookingDrawer() {
  const openId = useState<string | null>('booking-drawer-id', () => null)
  // Opened straight into the "why are you cancelling?" step (the row-level Cancel button).
  const startCancelling = useState<boolean>('booking-drawer-cancel', () => false)

  return {
    openId: computed(() => openId.value),
    startCancelling: computed(() => startCancelling.value),
    open: (bookingId: string, options: { cancel?: boolean } = {}) => {
      startCancelling.value = options.cancel ?? false
      openId.value = bookingId
    },
    close: () => {
      openId.value = null
      startCancelling.value = false
    },
  }
}
