interface ServiceChoice {
  id: string
  title: string
}

interface RebookResult {
  conversationId: string
  providerId: string
  providerName: string
  verified: boolean
  /** The provider's services a client can pick today (active ones). */
  services: ServiceChoice[]
  prefill: { serviceListingId: string | null, address: string | null }
}

export interface BookAgainTarget {
  providerId: string
  providerName: string
  services: ServiceChoice[]
  serviceId: string | null
  address: string | null
}

/**
 * "Book again" for a finished job. It asks the server to reopen the thread
 * with the same provider (and returns what the earlier job looked like), then
 * opens a pre-filled job-request form — it never books anything itself: a new
 * booking still needs the provider's quote and the client's acceptance.
 * `requestFrom` opens the same form empty, for a provider you haven't booked.
 * The form is mounted once in the dashboard layout and driven by this state.
 */
export function useBookAgain() {
  const target = useState<BookAgainTarget | null>('book-again-target', () => null)
  const isStarting = useState<boolean>('book-again-starting', () => false)
  const toast = useToast()
  const { t } = useI18n()
  const localePath = useLocalePath()

  async function start(bookingId: string) {
    if (isStarting.value) return
    isStarting.value = true
    try {
      const result = await useApiFetch<RebookResult>(`/api/dashboard/bookings/${bookingId}/rebook`, { method: 'POST' })
      if (!result.verified) {
        // They can't quote until verified, so a request would go nowhere — keep the conversation open instead.
        toast.info(t('marketplace.provider.pendingVerification'))
        await navigateTo(localePath({ path: '/messages', query: { conversation: result.conversationId } }))
        return
      }
      target.value = {
        providerId: result.providerId,
        providerName: result.providerName,
        services: result.services,
        serviceId: result.prefill.serviceListingId,
        address: result.prefill.address,
      }
    }
    catch (error) {
      toast.error(apiErrorMessage(error, t('dashboard.bookingDrawer.errors.rebook')))
    }
    finally {
      isStarting.value = false
    }
  }

  /** A fresh request to a provider (e.g. from the saved list); the form offers the provider's active services. */
  async function requestFrom(providerId: string, providerName: string) {
    if (isStarting.value) return
    isStarting.value = true
    try {
      const provider = await useApiFetch<{ services?: ServiceChoice[] }>(`/api/providers/${providerId}`)
      target.value = { providerId, providerName, services: provider.services ?? [], serviceId: null, address: null }
    }
    catch (error) {
      toast.error(apiErrorMessage(error, t('dashboard.bookingDrawer.errors.rebook')))
    }
    finally {
      isStarting.value = false
    }
  }

  return {
    target: computed(() => target.value),
    isStarting: computed(() => isStarting.value),
    start,
    requestFrom,
    close: () => {
      target.value = null
    },
  }
}
