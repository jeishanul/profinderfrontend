<script setup lang="ts">
import type { InvoiceSummary } from '#shared/types/billing'
import type { InvoiceStatusKey } from '~/utils/billing'

// Auto-imported as <BillingInvoiceStatusBadge/>. Paid / awaiting confirmation / overdue / unpaid / cancelled.
const props = defineProps<{
  invoice: Pick<InvoiceSummary, 'status' | 'isOverdue'>
}>()

const { t } = useI18n()

const VARIANT: Record<InvoiceStatusKey, 'primary' | 'accent' | 'danger' | 'neutral'> = {
  paid: 'primary',
  pendingReview: 'accent',
  overdue: 'danger',
  unpaid: 'accent',
  cancelled: 'neutral',
}

const key = computed(() => invoiceStatusKey(props.invoice))
</script>

<template>
  <UiTag
    :variant="VARIANT[key]"
    size="sm"
  >
    {{ t(`billing.status.${key}`) }}
  </UiTag>
</template>
