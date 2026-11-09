<script setup lang="ts">
import type { Invoice } from '#shared/types/billing'

// Where PayPal sends the provider back after approving (`?token=`): capture the payment, then show the invoice.
definePageMeta({
  middleware: 'auth',
  hideBottomNav: true,
})

const { t, te } = useI18n()
const toast = useToast()
const route = useRoute()
const localePath = useLocalePath()

const number = String(route.params.number)
const token = typeof route.query.token === 'string' ? route.query.token : ''

/** A known PayPal failure (`paypal_declined`, `not_payable`…) gets its own sentence; anything else the server's message. */
function failureMessage(error: unknown) {
  const code = apiErrorCode(error)
  if (code && te(`billing.paypalReturn.errors.${code}`)) return t(`billing.paypalReturn.errors.${code}`)
  return apiErrorMessage(error, t('billing.paypalReturn.failed'))
}

onMounted(async () => {
  const invoicePath = localePath(`/billing/invoices/${encodeURIComponent(number)}`)
  if (!token) {
    toast.error(t('billing.paypalReturn.failed'))
    await navigateTo(invoicePath, { replace: true })
    return
  }
  try {
    const { data } = await useApiFetch<{ data: Invoice }>(`/api/dashboard/billing/invoices/${encodeURIComponent(number)}/paypal/capture`, { method: 'POST', body: { token } })
    // A 200 is not always "paid": PayPal may still be reviewing the payment.
    if (data.status === 'paid') toast.success(t('billing.paypalReturn.paid'))
    else if (data.paypalPending) toast.info(t('billing.paypalReturn.pending'))
    else toast.error(t('billing.paypalReturn.failed'))
  }
  catch (error) {
    toast.error(failureMessage(error))
  }
  // Fresh reads of the invoice and of the levels (subscription, unpaid count), not the copies cached before payment.
  clearNuxtData(`billing-invoice-${number}`)
  refreshNuxtData(BILLING_OVERVIEW_KEY)
  await navigateTo(invoicePath, { replace: true })
})

useSeoMeta({
  title: () => t('billing.paypalReturn.processing'),
})
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
    <span
      class="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"
      aria-hidden="true"
    />
    <p
      role="status"
      class="mt-4 text-sm font-semibold"
    >
      {{ t('billing.paypalReturn.processing') }}
    </p>
  </div>
</template>
