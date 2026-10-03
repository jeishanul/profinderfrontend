<script setup lang="ts">
import type { PaymentStatus } from '#shared/types/dashboard'

// Auto-imported as <DashboardPaymentBadge/>. Companion to <DashboardStatusBadge/>
// — cash payment state for a booking, with the colour/label mapping in one place.
const props = defineProps<{
  status: PaymentStatus
}>()

const { t } = useI18n()

const VARIANT_BY_STATUS: Record<PaymentStatus, 'primary' | 'neutral' | 'accent'> = {
  paid_cash: 'primary',
  unpaid: 'neutral',
  refunded: 'accent',
}
</script>

<template>
  <UiTag
    :variant="VARIANT_BY_STATUS[props.status]"
    size="sm"
  >
    {{ t(`dashboard.payment.${props.status}`) }}
  </UiTag>
</template>
