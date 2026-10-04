/**
 * Emails a fresh verification code and opens the "verify your email" step of
 * the auth modal. Used by the dashboard banner and by every place that is
 * refused with `email_unverified` (sending a booking request, becoming a
 * provider), so they all start the same flow.
 */
export function useEmailVerification() {
  const authModal = useAuthModal()
  const toast = useToast()
  const { t } = useI18n()

  const isStarting = ref(false)

  async function start(onVerified?: () => void) {
    isStarting.value = true
    try {
      await useApiFetch('/api/auth/email/send', { method: 'POST' })
      authModal.open('verify-email', { onSuccess: onVerified })
    }
    catch (error) {
      toast.error(apiErrorMessage(error, t('ui.errors.generic')))
    }
    finally {
      isStarting.value = false
    }
  }

  return { start, isStarting }
}

/** True when the API refused an action because the account's email isn't verified yet. */
export function isEmailUnverifiedError(error: unknown): boolean {
  return apiErrorCode(error) === 'email_unverified'
}
