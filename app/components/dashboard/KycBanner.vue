<script setup lang="ts">
import type { KycState } from '#shared/types/dashboard'

// Auto-imported as <DashboardKycBanner/>. Verification state on the dashboard overview. With a paid badge it confirms
// it; without one <DashboardLevelOnePrompt/> either says what Level 1 still needs (that is what lets a pro take
// bookings) or, once Level 1 is done, points to the paid verification packages.
defineProps<{
  kyc: KycState
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="kyc.isVerified"
    class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-600/30 bg-brand-50 p-5 dark:bg-brand-700/10"
  >
    <div class="flex items-center gap-3.5">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
        <UiIcon
          name="check-circle"
          :size="21"
        />
      </span>
      <div>
        <div class="text-[15px] font-bold">
          {{ t('dashboard.overview.provider.kycVerified.title') }}
        </div>
        <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
          {{ t('dashboard.overview.provider.kycVerified.body') }}
        </div>
      </div>
    </div>
  </div>
  <DashboardLevelOnePrompt
    v-else
    :level-one="kyc.levelOne"
  />
</template>
