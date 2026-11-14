<script setup lang="ts">
import type { LevelOneState } from '#shared/types/billing'

// Auto-imported as <DashboardLevelOnePrompt/>. For a pro without a paid badge, on the dashboard and the Verification
// tab. Below Level 1 (verified email + required profile) it says what is still missing, since that is what lets them
// take bookings. Once Level 1 is done, verification is optional: it becomes a nudge towards the paid packages.
const props = defineProps<{
  levelOne: LevelOneState
}>()

const { t } = useI18n()

const missing = computed(() => props.levelOne.checks.filter(check => check.required && !check.done))
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
    :class="levelOne.complete
      ? 'border-brand-600/30 bg-brand-50 dark:bg-brand-700/10'
      : 'border-accent-600/30 bg-accent-50 dark:bg-accent-700/10'"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3.5">
      <span
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        :class="levelOne.complete
          ? 'bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
          : 'bg-accent-100 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100'"
      >
        <UiIcon
          :name="levelOne.complete ? 'shield-check' : 'alert-triangle'"
          :size="21"
        />
      </span>
      <div
        v-if="levelOne.complete"
        class="min-w-0"
      >
        <div class="text-[15px] font-bold">
          {{ t('dashboard.overview.provider.levelOne.promoTitle') }}
        </div>
        <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
          {{ t('dashboard.overview.provider.levelOne.promoBody') }}
        </div>
      </div>
      <div
        v-else
        class="min-w-0"
      >
        <div class="text-[15px] font-bold">
          {{ t('dashboard.overview.provider.levelOne.incompleteTitle') }}
        </div>
        <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
          {{ t('dashboard.overview.provider.levelOne.incompleteBody') }}
        </div>
        <p
          v-if="missing.length > 0"
          class="mt-1 text-xs font-semibold text-accent-700 dark:text-accent-100"
        >
          {{ t('dashboard.overview.provider.levelOne.missing') }} {{ missing.map(check => check.label).join(' · ') }}
        </p>
      </div>
    </div>
    <NuxtLinkLocale
      v-if="levelOne.complete"
      to="/billing"
      :class="linkButtonClass('primary')"
    >
      {{ t('dashboard.overview.provider.levelOne.promoCta') }}
    </NuxtLinkLocale>
    <NuxtLinkLocale
      v-else
      to="/profile"
      :class="linkButtonClass('primary')"
    >
      {{ t('dashboard.overview.provider.levelOne.completeProfile') }}
    </NuxtLinkLocale>
  </div>
</template>
