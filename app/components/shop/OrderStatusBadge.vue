<script setup lang="ts">
import type { ShopOrderStatus } from '#shared/types/shop'

// Auto-imported as <ShopOrderStatusBadge/>. The status pill of a shop order (list rows and the order page).
defineProps<{
  status: ShopOrderStatus
}>()

const { t } = useI18n()
</script>

<template>
  <UiTag
    :variant="shopOrderStatusTone(status)"
    size="sm"
  >
    {{ t(`shop.status.${status}`) }}
  </UiTag>
</template>
