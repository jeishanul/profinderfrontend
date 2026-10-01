<script setup lang="ts">
import type { ServiceListing } from '#shared/types/dashboard'

// Auto-imported as <DashboardServicePreviewModal/>. Read-only preview of how
// a listing reads to a consumer — mirrors <DashboardServiceCard/>'s layout
// without any of its edit/status affordances.
defineProps<{
  open: boolean
  service: ServiceListing | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const categoryLabel = useCategoryLabel()
const servicePrice = useServicePrice()
const titleId = useId()
</script>

<template>
  <UiModal
    :open="open"
    :labelledby="titleId"
    @close="emit('close')"
  >
    <template v-if="service">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h2
          :id="titleId"
          class="font-display text-lg font-bold"
        >
          {{ t('dashboard.services.form.previewTitle') }}
        </h2>
        <UiTag :variant="service.status === 'active' ? 'primary' : 'neutral'">
          {{ service.status === 'active' ? t('dashboard.services.statusActive') : t('dashboard.services.statusPaused') }}
        </UiTag>
      </div>

      <div class="flex gap-3.5">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
          <UiIcon
            name="briefcase"
            :size="20"
          />
        </span>
        <div>
          <div class="text-[15.5px] font-bold">
            {{ service.title }}
          </div>
          <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
            {{ categoryLabel(service.categoryId, service.categoryName) }} &middot; {{ service.durationLabel }}
          </div>
        </div>
      </div>

      <p class="mt-4 text-[13px] leading-relaxed text-black/60 dark:text-white/60">
        {{ service.description }}
      </p>

      <div class="mt-4 flex items-center gap-4 border-t border-black/10 pt-3.5 text-[12.5px] text-black/60 dark:border-white/10 dark:text-white/60">
        <span class="font-bold text-black dark:text-white">{{ servicePrice(service) }}</span>
        <span>{{ t('dashboard.services.bookingsCount', { count: service.bookingsCount }) }}</span>
        <span class="flex items-center gap-1">
          <UiIcon
            name="star"
            filled
            :size="13"
            class="text-accent-600"
          />
          {{ service.rating.toFixed(1) }}
        </span>
      </div>

      <UiButton
        variant="ghost"
        class="mt-5 w-full"
        @click="emit('close')"
      >
        {{ t('dashboard.services.form.closePreview') }}
      </UiButton>
    </template>
  </UiModal>
</template>
