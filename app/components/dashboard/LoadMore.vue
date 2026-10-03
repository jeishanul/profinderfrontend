<script setup lang="ts">
// Auto-imported as <DashboardLoadMore/>. The footer of a server-paged list:
// "Showing 20 of 87" and a button for the next page (see `usePagedList`).
defineProps<{
  shown: number
  total: number
  hasMore: boolean
  loading: boolean
  failed?: boolean
}>()

defineEmits<{
  more: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="total > 0"
    class="flex flex-col items-center gap-2 pt-2"
  >
    <p class="text-xs text-black/60 dark:text-white/60">
      {{ t('dashboard.common.showing', { shown, total }) }}
    </p>
    <p
      v-if="failed"
      role="alert"
      class="text-xs font-semibold text-red-700 dark:text-red-300"
    >
      {{ t('dashboard.common.loadMoreFailed') }}
    </p>
    <UiButton
      v-if="hasMore"
      variant="secondary"
      :disabled="loading"
      @click="$emit('more')"
    >
      {{ loading ? t('dashboard.common.loadingMore') : t('dashboard.common.loadMore') }}
    </UiButton>
  </div>
</template>
