<script setup lang="ts">
// Auto-imported as <DashboardDualRoleBanner/>. Shown on the dashboard
// overview regardless of the active role — the requirement it encodes
// (every seller can also buy) can't be optional, so the entry point to
// Browse Services stays visible no matter which mode the panel is in.
const { t } = useI18n()
const { settings } = useSiteSettings()
const siteName = computed(() => settings.value.siteName ?? t('brand.name'))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-black/[0.02] px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
    <div class="flex items-center gap-3.5">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
        <UiIcon
          name="shield-check"
          :size="18"
        />
      </span>
      <div>
        <div class="text-sm font-bold">
          {{ t('dashboard.dualRoleBanner.title', { site: siteName }) }}
        </div>
        <div class="mt-0.5 text-xs text-black/60 dark:text-white/60">
          {{ t('dashboard.dualRoleBanner.body') }}
        </div>
      </div>
    </div>
    <NuxtLinkLocale
      to="/browse"
      :class="linkButtonClass('secondary')"
    >
      {{ t('dashboard.dualRoleBanner.cta') }}
      <UiIcon
        name="arrow-right"
        :size="15"
      />
    </NuxtLinkLocale>
  </div>
</template>
