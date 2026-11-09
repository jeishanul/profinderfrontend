<script setup lang="ts">
import type { KycState } from '#shared/types/dashboard'

// Auto-imported as <DashboardKycBanner/>. Compact KYC nudge on the dashboard
// overview — the full step-by-step flow lives on the profile page
// (<DashboardKycStepper/>), since verification is mandatory before a
// provider can accept bookings.
const props = defineProps<{
  kyc: KycState
}>()

const { t } = useI18n()

// `steps` are the requirements of the levels held (or of Level 2 when none is), so the count follows what is bought.
const completedCount = computed(() => props.kyc.steps.filter(step => step.status === 'verified').length)
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
    :class="kyc.isVerified
      ? 'border-brand-600/30 bg-brand-50 dark:bg-brand-700/10'
      : 'border-red-600/30 bg-red-50 dark:bg-red-900/10'"
  >
    <div class="flex items-center gap-3.5">
      <span
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        :class="kyc.isVerified
          ? 'bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'"
      >
        <UiIcon
          :name="kyc.isVerified ? 'check-circle' : 'alert-triangle'"
          :size="21"
        />
      </span>
      <div v-if="kyc.isVerified">
        <div class="text-[15px] font-bold">
          {{ t('dashboard.overview.provider.kycVerified.title') }}
        </div>
        <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
          {{ t('dashboard.overview.provider.kycVerified.body') }}
        </div>
      </div>
      <div v-else>
        <div class="text-[15px] font-bold">
          {{ t('dashboard.overview.provider.kycNudge.title') }}
        </div>
        <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
          {{ t('dashboard.overview.provider.kycNudge.body') }}<template v-if="kyc.steps.length > 0">
            ({{ completedCount }}/{{ kyc.steps.length }})
          </template>
        </div>
      </div>
    </div>
    <NuxtLinkLocale
      v-if="!kyc.isVerified"
      :to="{ path: '/profile', query: { tab: 'kyc' } }"
      :class="linkButtonClass('primary')"
    >
      {{ t('dashboard.overview.provider.kycNudge.cta') }}
    </NuxtLinkLocale>
  </div>
</template>
