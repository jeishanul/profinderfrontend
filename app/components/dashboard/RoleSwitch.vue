<script setup lang="ts">
import type { UserRole } from '#shared/types/dashboard'

// Auto-imported as <DashboardRoleSwitch/>. Lives in the dashboard topbar
// (see `layouts/dashboard.vue`) — switches which panel you're in. Provider-
// only nav (My profile/Verification, My Services, Clients Served) and
// consumer-only nav (My Purchases, Saved Providers) show/hide based on this;
// Browse Services stays reachable in both modes (see `DashboardDualRoleBanner`).
// Shown Consumer-first since most people who sign up are consumers.
const session = useSession()
const { t } = useI18n()

function optionClass(role: UserRole) {
  return [
    'rounded-full px-4 py-2 text-xs font-bold transition-colors',
    session.activeRole.value === role
      ? 'bg-brand-600 text-white'
      : 'text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white',
  ]
}
</script>

<template>
  <!-- Only people who actually have a provider profile can switch panels;
       everyone else is offered the explicit way to become one. -->
  <NuxtLinkLocale
    v-if="!session.isProvider.value"
    to="/become-a-provider"
    class="inline-flex items-center rounded-full border border-brand-600/30 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-100/20 dark:bg-brand-700/20 dark:text-brand-100"
  >
    {{ t('dashboard.roleSwitch.becomeProvider') }}
  </NuxtLinkLocale>
  <div
    v-else
    class="inline-flex gap-1 rounded-full border border-black/10 bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.06]"
  >
    <button
      type="button"
      :class="optionClass('consumer')"
      @click="session.setActiveRole('consumer')"
    >
      {{ t('dashboard.roleSwitch.consumer') }}
    </button>
    <button
      type="button"
      :class="optionClass('provider')"
      @click="session.setActiveRole('provider')"
    >
      {{ t('dashboard.roleSwitch.provider') }}
    </button>
  </div>
</template>
