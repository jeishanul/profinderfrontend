<script setup lang="ts">
import type { ShopOrder } from '#shared/types/shop'

// Where PayPal sends the shopper back after approving (`?token=`): capture the payment, then show the order.
definePageMeta({
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const localePath = useLocalePath()

const number = String(route.params.number)
const token = typeof route.query.token === 'string' ? route.query.token : ''

onMounted(async () => {
  const orderPath = localePath(`/shop/orders/${number}`)
  if (!token) {
    toast.error(t('shop.order.payFailed'))
    await navigateTo(orderPath, { replace: true })
    return
  }
  try {
    await useApiFetch<{ data: ShopOrder }>(`/api/shop/orders/${encodeURIComponent(number)}/paypal/capture`, { method: 'POST', body: { token } })
    toast.success(t('shop.order.paid'))
    // The cart page and badge may still show what was just bought (the order came from the cart).
    void useShopCart().refresh().catch(() => {})
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('shop.order.payFailed')))
  }
  // A fresh read of the order, not the copy cached before payment.
  clearNuxtData(`shop-order-${number}`)
  await navigateTo(orderPath, { replace: true })
})

useSeoMeta({
  title: () => t('shop.order.processingPayment'),
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
      {{ t('shop.order.processingPayment') }}
    </p>
  </div>
</template>
